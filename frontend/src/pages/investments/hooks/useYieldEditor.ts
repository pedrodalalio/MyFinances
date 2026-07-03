import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/utils/api";
import {
  getEffectiveAmount,
  type Investment,
  type InvestmentYieldUpdate,
  type YieldChange,
} from "../types";
import { useSaveYieldsMutation, type YieldSaveRequest } from "./useInvestments";

// Estado de edição da aba Rendimentos: campos de bruto/líquido por
// investimento, preços por cota (ETF/FII), cotações via BRAPI, importação de
// extrato PDF e persistência das alterações.
export function useYieldEditor(yieldInvestments: Investment[]) {
  const [yieldUpdates, setYieldUpdates] = useState<Record<string, InvestmentYieldUpdate>>({});
  const [etfPrices, setEtfPrices] = useState<Record<string, string>>({});
  const [fetchingQuotes, setFetchingQuotes] = useState(false);
  const [importingStatement, setImportingStatement] = useState(false);
  const saveMutation = useSaveYieldsMutation();

  // Reinicializa os campos quando a lista de investimentos muda (novo fetch)
  useEffect(() => {
    const updates: Record<string, InvestmentYieldUpdate> = {};
    yieldInvestments.forEach((inv) => {
      updates[inv.id] = {
        gross_yield: inv.gross_yield?.toString() || "",
        net_value: inv.net_value?.toString() || "",
      };
    });
    setYieldUpdates(updates);
  }, [yieldInvestments]);

  const handleYieldFieldChange = (
    investmentId: string,
    field: "gross_yield" | "net_value",
    value: string,
  ) => {
    setYieldUpdates((prev) => ({
      ...prev,
      [investmentId]: {
        ...prev[investmentId],
        [field]: value,
      },
    }));
  };

  const handleEtfPriceChange = (ticker: string, value: string) => {
    setEtfPrices((prev) => ({ ...prev, [ticker]: value }));
  };

  const handleFetchQuotes = async () => {
    try {
      setFetchingQuotes(true);
      const response = await api.get("/investments/quotes");
      const quotes: Array<{ ticker: string; price: number }> = response.data.quotes ?? [];
      const notFound: string[] = response.data.notFound ?? [];

      const priceMap = new Map<string, number>();
      quotes.forEach((q) => priceMap.set(q.ticker.trim().toUpperCase(), q.price));

      const updatedEtf: Record<string, string> = {};
      const grossById: Record<string, string> = {};
      const skippedNoQty: string[] = [];
      let applied = 0;

      yieldInvestments.forEach((inv) => {
        if (!inv.ticker) return;
        const price = priceMap.get(inv.ticker.trim().toUpperCase());
        if (price === undefined) return;

        if (inv.investment_type === "ETF" || inv.investment_type === "FII") {
          updatedEtf[inv.ticker] = price.toFixed(2);
          applied++;
        } else if (inv.quantity && inv.quantity > 0) {
          grossById[inv.id] = (price * inv.quantity).toFixed(2);
          applied++;
        } else {
          skippedNoQty.push(inv.ticker);
        }
      });

      if (Object.keys(updatedEtf).length > 0) {
        setEtfPrices((prev) => ({ ...prev, ...updatedEtf }));
      }
      if (Object.keys(grossById).length > 0) {
        setYieldUpdates((prev) => {
          const next = { ...prev };
          for (const [id, gross] of Object.entries(grossById)) {
            next[id] = {
              ...(next[id] ?? { gross_yield: "", net_value: "" }),
              gross_yield: gross,
            };
          }
          return next;
        });
      }

      if (applied === 0) {
        toast.info("Nenhuma cotação aplicada. Cadastre o ticker (e a quantidade) nos investimentos.");
      } else {
        toast.success(`${applied} cotação(ões) atualizada(s). Confira e clique em Salvar.`);
      }

      const warnings: string[] = [];
      if (notFound.length > 0) warnings.push(`não encontrados: ${notFound.join(", ")}`);
      if (skippedNoQty.length > 0) warnings.push(`sem quantidade: ${skippedNoQty.join(", ")}`);
      if (warnings.length > 0) toast.warning(warnings.join(" · "));
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 503) {
        toast.error("BRAPI_TOKEN não configurado no backend.");
      } else {
        toast.error("Não foi possível buscar as cotações. Tente novamente.");
      }
    } finally {
      setFetchingQuotes(false);
    }
  };

  // Importa um extrato de renda fixa (PDF) e preenche os campos de bruto/líquido
  // dos CDBs (e afins) já cadastrados que baterem com os títulos do extrato.
  // Não salva: o usuário confere e clica em Salvar, como no "Atualizar cotações".
  const handleImportStatement = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // permite reenviar o mesmo arquivo
    if (!file) return;

    try {
      setImportingStatement(true);
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post("/investments/import-statement", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const matched: Array<{
        investmentId: string;
        newGross: number;
        newNet: number;
      }> = response.data.matched ?? [];
      const unmatched: Array<unknown> = response.data.unmatched ?? [];

      if (matched.length > 0) {
        setYieldUpdates((prev) => {
          const next = { ...prev };
          for (const m of matched) {
            next[m.investmentId] = {
              gross_yield: m.newGross.toFixed(2),
              net_value: m.newNet.toFixed(2),
            };
          }
          return next;
        });
        toast.success(
          `${matched.length} investimento(s) atualizado(s) pelo extrato. Confira e clique em Salvar.`,
        );
      } else {
        toast.info(
          "Nenhum título do extrato bateu com os investimentos cadastrados. Confira data de aplicação e valor aplicado.",
        );
      }

      if (unmatched.length > 0) {
        toast.warning(
          `${unmatched.length} título(s) do extrato sem investimento correspondente no app.`,
        );
      }
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Não foi possível ler o extrato. Verifique o PDF.";
      toast.error(message);
    } finally {
      setImportingStatement(false);
    }
  };

  // Calcula o diff entre os valores atuais e os digitados (para o resumo)
  const computeYieldChanges = (): YieldChange[] => {
    const changes: YieldChange[] = [];

    yieldInvestments.forEach((inv) => {
      let newGrossYield: number;
      let newNetValue: number;
      let prevGross: number;
      let prevNet: number;

      if ((inv.investment_type === "ETF" || inv.investment_type === "FII") && inv.ticker) {
        const priceStr = etfPrices[inv.ticker];
        if (!priceStr || priceStr.trim() === "") return;
        const price = parseFloat(priceStr);
        if (isNaN(price) || !inv.quantity) return;
        newGrossYield = price * inv.quantity;
        prevGross = inv.gross_yield ?? getEffectiveAmount(inv);
        prevNet = inv.net_value ?? prevGross;
        newNetValue = inv.net_value ?? newGrossYield;
      } else {
        const update = yieldUpdates[inv.id];
        if (!update) return;
        const grossEntered = update.gross_yield.trim();
        const netEntered = update.net_value.trim();
        if (grossEntered === "" && netEntered === "") return;
        prevGross = inv.gross_yield ?? getEffectiveAmount(inv);
        prevNet = inv.net_value ?? prevGross;
        newGrossYield = grossEntered === "" ? prevGross : parseFloat(grossEntered);
        newNetValue = netEntered === "" ? prevNet : parseFloat(netEntered);
        if (isNaN(newGrossYield) || isNaN(newNetValue)) return;
      }

      const grossChanged = Math.abs(newGrossYield - prevGross) > 0.001;
      const netChanged = Math.abs(newNetValue - prevNet) > 0.001;

      if (!grossChanged && !netChanged) return;

      const grossDiff = newGrossYield - prevGross;
      const grossDiffPercent = prevGross !== 0 ? (grossDiff / prevGross) * 100 : 0;
      const netDiff = newNetValue - prevNet;
      const netDiffPercent = prevNet !== 0 ? (netDiff / prevNet) * 100 : 0;

      changes.push({
        id: inv.id,
        name: inv.name,
        type: inv.investment_type,
        previousGrossYield: prevGross,
        newGrossYield,
        grossYieldDiff: grossDiff,
        grossYieldDiffPercent: grossDiffPercent,
        previousNetValue: prevNet,
        newNetValue,
        netValueDiff: netDiff,
        netValueDiffPercent: netDiffPercent,
      });
    });

    return changes;
  };

  // Persiste os valores digitados (bruto/líquido e preço por cota × quantidade)
  const saveYields = () => {
    const requests: YieldSaveRequest[] = [];

    yieldInvestments.forEach((inv) => {
      if ((inv.investment_type === "ETF" || inv.investment_type === "FII") && inv.ticker) {
        const priceStr = etfPrices[inv.ticker];
        if (!priceStr) return;
        const price = parseFloat(priceStr);
        if (isNaN(price) || !inv.quantity) return;
        requests.push({ id: inv.id, body: { gross_yield: price * inv.quantity } });
        return;
      }

      const update = yieldUpdates[inv.id];
      if (!update) return;

      const grossYield = parseFloat(update.gross_yield);
      const netValue = parseFloat(update.net_value);

      const body: Record<string, number> = {};
      if (!isNaN(grossYield) && grossYield !== (inv.gross_yield ?? 0)) body.gross_yield = grossYield;
      if (!isNaN(netValue) && netValue !== (inv.net_value ?? 0)) body.net_value = netValue;

      if (Object.keys(body).length === 0) return;

      requests.push({ id: inv.id, body });
    });

    saveMutation.mutate(requests);
  };

  return {
    yieldUpdates,
    etfPrices,
    fetchingQuotes,
    importingStatement,
    savingYields: saveMutation.isPending,
    handleYieldFieldChange,
    handleEtfPriceChange,
    handleFetchQuotes,
    handleImportStatement,
    computeYieldChanges,
    saveYields,
  };
}
