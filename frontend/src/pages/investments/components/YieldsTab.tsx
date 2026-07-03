import { useMemo, useRef, useState } from "react";
import { Loader2, RefreshCw, Save, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import QueryError from "@/components/QueryError";

import type { YieldChange } from "../types";
import { usePortfolioQuery } from "../hooks/useInvestments";
import { useYieldEditor } from "../hooks/useYieldEditor";
import { YieldTickerGroup } from "./YieldTickerGroup";
import { YieldTreasuryGroups } from "./YieldTreasuryGroups";
import { YieldOtherInvestments } from "./YieldOtherInvestments";
import { YieldSummaryDialog } from "./YieldSummaryDialog";

// Aba Rendimentos: atualização manual/automática dos valores brutos e líquidos
export function YieldsTab() {
  const [yieldSortBy, setYieldSortBy] = useState<"date" | "name">("date");
  const [isYieldSummaryOpen, setIsYieldSummaryOpen] = useState(false);
  const [yieldChanges, setYieldChanges] = useState<YieldChange[]>([]);
  const statementInputRef = useRef<HTMLInputElement>(null);

  const portfolioQuery = usePortfolioQuery();

  const yieldInvestments = useMemo(
    () =>
      (portfolioQuery.data?.allInvestments ?? []).filter(
        (inv) => inv.status === "ACTIVE",
      ),
    [portfolioQuery.data],
  );

  const {
    yieldUpdates,
    etfPrices,
    fetchingQuotes,
    importingStatement,
    savingYields,
    handleYieldFieldChange,
    handleEtfPriceChange,
    handleFetchQuotes,
    handleImportStatement,
    computeYieldChanges,
    saveYields,
  } = useYieldEditor(yieldInvestments);

  const loadingYields = portfolioQuery.isPending;

  const sortedYieldInvestments = useMemo(() => {
    const sorted = [...yieldInvestments].sort((a, b) => {
      // Primeiro agrupar por tipo
      if (a.investment_type !== b.investment_type) {
        return a.investment_type.localeCompare(b.investment_type);
      }
      // Dentro do tipo, ordenar pelo critério selecionado
      if (yieldSortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      const dateA = a.purchase_date ? new Date(a.purchase_date).getTime() : 0;
      const dateB = b.purchase_date ? new Date(b.purchase_date).getTime() : 0;
      return dateA - dateB;
    });
    return sorted;
  }, [yieldInvestments, yieldSortBy]);

  // Abre o resumo das alterações; salvar de fato acontece no confirmar
  const handleSaveYields = () => {
    const changes = computeYieldChanges();
    if (changes.length === 0) return;
    setYieldChanges(changes);
    setIsYieldSummaryOpen(true);
  };

  const confirmSaveYields = () => {
    setIsYieldSummaryOpen(false);
    saveYields();
  };

  if (portfolioQuery.isError) {
    return <QueryError onRetry={() => portfolioQuery.refetch()} />;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Atualizar Rendimentos dos Investimentos
            </CardTitle>
            <div className="flex items-center gap-2">
              <input
                ref={statementInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleImportStatement}
              />
              <Button
                variant="outline"
                onClick={() => statementInputRef.current?.click()}
                disabled={importingStatement || loadingYields}
              >
                {importingStatement ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Importar extrato (PDF)
              </Button>
              <Button
                variant="outline"
                onClick={handleFetchQuotes}
                disabled={fetchingQuotes || loadingYields}
              >
                {fetchingQuotes ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Atualizar cotações
              </Button>
              <Select
                value={yieldSortBy}
                onValueChange={(v) => setYieldSortBy(v as "date" | "name")}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Ordenar por Data</SelectItem>
                  <SelectItem value="name">Ordenar por Nome</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Atualize os valores brutos e líquidos de cada investimento conforme o app do banco.
            Os valores devem ser o <strong>valor total atual</strong> (aplicado + rendimento).
            Use <strong>Atualizar cotações</strong> para buscar os preços de ações, FIIs e ETFs
            automaticamente (BRAPI) nos ativos com ticker e quantidade cadastrados. Use{" "}
            <strong>Importar extrato (PDF)</strong> para preencher bruto/líquido dos CDBs e
            títulos de renda fixa a partir do extrato do banco. Confira e clique em Salvar.
          </p>
        </CardHeader>
        <CardContent>
          {loadingYields ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">
                Carregando investimentos...
              </span>
            </div>
          ) : sortedYieldInvestments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum investimento ativo encontrado.
            </div>
          ) : (
            <div className="space-y-4">
              {/* ETFs e FIIs agrupados por ticker (preço da cota × quantidade) */}
              <YieldTickerGroup
                typeKey="ETF"
                heading="ETFs"
                investments={sortedYieldInvestments}
                etfPrices={etfPrices}
                onPriceChange={handleEtfPriceChange}
              />
              <YieldTickerGroup
                typeKey="FII"
                heading="FIIs"
                investments={sortedYieldInvestments}
                etfPrices={etfPrices}
                onPriceChange={handleEtfPriceChange}
              />

              {/* Tesouro Direto agrupado por categoria */}
              <YieldTreasuryGroups
                investments={sortedYieldInvestments}
                yieldUpdates={yieldUpdates}
                onFieldChange={handleYieldFieldChange}
              />

              {/* Outros investimentos (não-ETF, não-FII e não-Tesouro) */}
              <YieldOtherInvestments
                investments={sortedYieldInvestments}
                yieldUpdates={yieldUpdates}
                onFieldChange={handleYieldFieldChange}
              />

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button onClick={handleSaveYields} disabled={savingYields} className="">
                  {savingYields ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Rendimentos
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Resumo de Mudanças nos Rendimentos */}
      <YieldSummaryDialog
        open={isYieldSummaryOpen}
        onOpenChange={setIsYieldSummaryOpen}
        changes={yieldChanges}
        saving={savingYields}
        onConfirm={confirmSaveYields}
      />
    </>
  );
}
