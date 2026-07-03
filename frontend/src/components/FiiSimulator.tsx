import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Coins,
  Flag,
  TrendingUp,
  Wallet,
  PiggyBank,
  Plus,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/utils/api";
import { queryKeys } from "@/lib/query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FiiIncomeData } from "@/components/FiiIncomePanel";
import { formatBRL } from "@/components/FiiIncomePanel";

interface SimulationPoint {
  month: number;
  /** Renda mensal reinvestindo os proventos */
  incomeReinvest: number;
  /** Renda mensal sem reinvestir */
  incomePlain: number;
  /** Patrimônio na trilha com reinvestimento */
  capitalReinvest: number;
  /** Quanto saiu do bolso até aqui */
  contributed: number;
}

/**
 * Modo por valor: aporte fixo em R$, yield constante sobre o capital.
 * Aporte entra no início do mês e rende no fim.
 */
function simulateByValue(
  months: number,
  monthlyContribution: number,
  annualYieldPct: number,
  initialCapital: number,
): SimulationPoint[] {
  const rate = annualYieldPct / 100 / 12;
  const points: SimulationPoint[] = [];

  let capitalReinvest = initialCapital;
  let capitalPlain = initialCapital;
  let contributed = initialCapital;

  for (let month = 1; month <= months; month++) {
    capitalReinvest += monthlyContribution;
    capitalPlain += monthlyContribution;
    contributed += monthlyContribution;

    const incomeReinvest = capitalReinvest * rate;
    const incomePlain = capitalPlain * rate;
    capitalReinvest += incomeReinvest; // bola de neve

    points.push({
      month,
      incomeReinvest,
      incomePlain,
      capitalReinvest,
      contributed,
    });
  }

  return points;
}

interface CotaFund {
  ticker: string;
  /** Preço atual da cota (cotação ou preço médio pago como fallback) */
  price: number;
  /** Distribuição média mensal por cota (12m) */
  dividend: number;
  /** Cotas compradas por mês */
  buyPerMonth: number;
  /** Cotas que o usuário já tem (quando parte da carteira atual) */
  initialQuantity: number;
  /** Custo real da posição atual */
  initialInvested: number;
}

/**
 * Modo por cotas: compra N cotas de cada fundo por mês. No reinvestimento os
 * proventos acumulam em caixa e compram cotas INTEIRAS, priorizando o fundo
 * de maior rendimento por real investido; a sobra fica em caixa para o mês
 * seguinte.
 */
function simulateByCotas(
  months: number,
  funds: CotaFund[],
): { points: SimulationPoint[]; finalQuantities: number[] } {
  const points: SimulationPoint[] = [];

  const qtyReinvest = funds.map((f) => f.initialQuantity);
  const qtyPlain = funds.map((f) => f.initialQuantity);
  let cash = 0;
  let contributed = funds.reduce((sum, f) => sum + f.initialInvested, 0);

  // Ordem de reinvestimento: melhor dividendo por real investido primeiro
  const reinvestOrder = funds
    .map((_, index) => index)
    .sort(
      (a, b) =>
        funds[b].dividend / funds[b].price - funds[a].dividend / funds[a].price,
    );

  for (let month = 1; month <= months; month++) {
    for (let i = 0; i < funds.length; i++) {
      qtyReinvest[i] += funds[i].buyPerMonth;
      qtyPlain[i] += funds[i].buyPerMonth;
      contributed += funds[i].buyPerMonth * funds[i].price;
    }

    const incomeReinvest = funds.reduce(
      (sum, f, i) => sum + qtyReinvest[i] * f.dividend,
      0,
    );
    const incomePlain = funds.reduce(
      (sum, f, i) => sum + qtyPlain[i] * f.dividend,
      0,
    );

    cash += incomeReinvest;
    for (const i of reinvestOrder) {
      const buyable = Math.floor(cash / funds[i].price);
      if (buyable > 0) {
        qtyReinvest[i] += buyable;
        cash -= buyable * funds[i].price;
      }
    }

    const capitalReinvest =
      funds.reduce((sum, f, i) => sum + qtyReinvest[i] * f.price, 0) + cash;

    points.push({
      month,
      incomeReinvest,
      incomePlain,
      capitalReinvest,
      contributed,
    });
  }

  return { points, finalQuantities: qtyReinvest };
}

const YEAR_OPTIONS = ["1", "2", "3", "5", "10", "15", "20", "25", "30"];

const MILESTONE_TARGETS = [100, 250, 500, 1000, 2500, 5000, 10000, 25000];

const formatMonths = (months: number): string => {
  if (months < 12) return `${months} ${months === 1 ? "mês" : "meses"}`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const yearPart = `${years} ${years === 1 ? "ano" : "anos"}`;
  return rest > 0 ? `${yearPart} e ${rest}m` : yearPart;
};

const SimTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: number;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs shadow-md">
      <p className="mb-1 font-medium">
        Mês {label} ({formatMonths(label ?? 0)})
      </p>
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-1.5">
          <span
            className="inline-block size-2 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>{" "}
          <span className="font-medium">{formatBRL(entry.value)}/mês</span>
        </p>
      ))}
    </div>
  );
};

export const FiiSimulator = () => {
  const [mode, setMode] = useState<"valor" | "cotas">("valor");
  const [contribution, setContribution] = useState("500");
  const [years, setYears] = useState("10");
  const [yieldBase, setYieldBase] = useState("portfolio");
  const [customYield, setCustomYield] = useState("11");
  const [includePortfolio, setIncludePortfolio] = useState(true);
  const [buyQuantities, setBuyQuantities] = useState<Record<string, string>>(
    {},
  );
  // FIIs de fora da carteira, adicionados pelo lookup
  const [extraFunds, setExtraFunds] = useState<
    Array<{ ticker: string; price: number; dividend: number }>
  >([]);
  const [lookupTicker, setLookupTicker] = useState("");

  const incomeQuery = useQuery<FiiIncomeData>({
    queryKey: queryKeys.fiiIncome,
    queryFn: async () => (await api.get("/investments/fii-income")).data,
  });
  const data = incomeQuery.data ?? null;

  // Cotação atual pra precificar as compras do modo por cotas
  const quotesQuery = useQuery<{
    quotes: Array<{ ticker: string; price: number }>;
  }>({
    queryKey: ["investment-quotes"],
    queryFn: async () => (await api.get("/investments/quotes")).data,
  });

  const quotes = useMemo(() => {
    const map: Record<string, number> = {};
    for (const quote of quotesQuery.data?.quotes ?? []) {
      map[quote.ticker] = quote.price;
    }
    return map;
  }, [quotesQuery.data]);

  // Defaults que dependem dos dados: só na primeira carga, pra não
  // sobrescrever escolhas do usuário num eventual refetch
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!data || initializedRef.current) return;
    initializedRef.current = true;
    if (!data.funds?.length) {
      setYieldBase("custom");
      setIncludePortfolio(false);
    } else {
      // Começa comprando 1 cota de cada fundo por mês
      setBuyQuantities(
        Object.fromEntries(data.funds.map((f) => [f.ticker, "1"])),
      );
    }
  }, [data]);

  useEffect(() => {
    if (incomeQuery.isError)
      toast.error("Não foi possível carregar seus FIIs para a simulação.");
  }, [incomeQuery.isError]);

  useEffect(() => {
    if (quotesQuery.isError)
      toast.error(
        "Não foi possível carregar as cotações. Usando o preço médio pago.",
      );
  }, [quotesQuery.isError]);

  const annualYield = useMemo(() => {
    if (yieldBase === "custom") return parseFloat(customYield) || 0;
    if (yieldBase === "portfolio") return data?.summary.projected_yield ?? 0;
    const fund = data?.funds.find((f) => f.ticker === yieldBase);
    return fund?.projected_yield ?? 0;
  }, [yieldBase, customYield, data]);

  const totalMonths = (parseInt(years) || 1) * 12;

  const lookupMutation = useMutation({
    mutationFn: async (ticker: string) => {
      const response = await api.get(`/investments/fii-lookup/${ticker}`);
      return response.data as { price?: number; avg_per_share_12m?: number };
    },
    onSuccess: ({ price, avg_per_share_12m }, ticker) => {
      if (!price || !avg_per_share_12m) {
        toast.error(
          `Achei o ${ticker}, mas sem ${!price ? "cotação" : "histórico de proventos"} disponível.`,
        );
        return;
      }
      setExtraFunds((prev) => [
        ...prev,
        { ticker, price, dividend: avg_per_share_12m },
      ]);
      setBuyQuantities((prev) => ({ ...prev, [ticker]: "1" }));
      setLookupTicker("");
    },
    onError: (error: unknown, ticker) => {
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      toast.error(
        status === 404
          ? `Não encontrei proventos para ${ticker}. Confira o ticker.`
          : "Não foi possível buscar o FII agora. Tente novamente.",
      );
    },
  });
  const lookingUp = lookupMutation.isPending;

  const addExtraFund = () => {
    const ticker = lookupTicker.trim().toUpperCase();
    if (!ticker || lookingUp) return;
    if (
      data?.funds.some((f) => f.ticker === ticker) ||
      extraFunds.some((f) => f.ticker === ticker)
    ) {
      toast.error(`${ticker} já está na simulação.`);
      return;
    }
    lookupMutation.mutate(ticker);
  };

  const removeExtraFund = (ticker: string) => {
    setExtraFunds((prev) => prev.filter((f) => f.ticker !== ticker));
    setBuyQuantities((prev) => {
      const next = { ...prev };
      delete next[ticker];
      return next;
    });
  };

  // Fundos do modo por cotas: carteira (preço da cotação ou preço médio pago)
  // + FIIs externos do lookup. Sem preço ou sem distribuição, fica de fora.
  const cotaFunds: CotaFund[] = useMemo(() => {
    const buyOf = (ticker: string) =>
      Math.max(0, Math.floor(parseFloat(buyQuantities[ticker] ?? "0")) || 0);

    const portfolio = (data?.funds ?? []).map((fund) => {
      const avgPrice = fund.quantity > 0 ? fund.invested / fund.quantity : 0;
      return {
        ticker: fund.ticker,
        price: quotes[fund.ticker] ?? avgPrice,
        dividend: fund.avg_per_share_12m,
        buyPerMonth: buyOf(fund.ticker),
        initialQuantity: includePortfolio ? fund.quantity : 0,
        initialInvested: includePortfolio ? fund.invested : 0,
      };
    });

    const extras = extraFunds.map((fund) => ({
      ticker: fund.ticker,
      price: fund.price,
      dividend: fund.dividend,
      buyPerMonth: buyOf(fund.ticker),
      initialQuantity: 0,
      initialInvested: 0,
    }));

    return [...portfolio, ...extras].filter(
      (fund) => fund.price > 0 && fund.dividend > 0,
    );
  }, [data, quotes, buyQuantities, includePortfolio, extraFunds]);

  const cotaResult = useMemo(
    () => simulateByCotas(totalMonths, cotaFunds),
    [totalMonths, cotaFunds],
  );

  const monthlyContribution =
    mode === "valor"
      ? parseFloat(contribution) || 0
      : cotaFunds.reduce((sum, f) => sum + f.buyPerMonth * f.price, 0);

  const points = useMemo(() => {
    if (mode === "cotas") return cotaResult.points;
    const initialCapital =
      includePortfolio && data ? data.summary.invested : 0;
    return simulateByValue(
      totalMonths,
      monthlyContribution,
      annualYield,
      initialCapital,
    );
  }, [
    mode,
    cotaResult,
    totalMonths,
    monthlyContribution,
    annualYield,
    includePortfolio,
    data,
  ]);

  const last = points[points.length - 1];
  const totalIncomeReceived = points.reduce(
    (sum, p) => sum + p.incomeReinvest,
    0,
  );

  const milestones = useMemo(() => {
    const found: Array<{ label: string; month: number }> = [];

    if (monthlyContribution > 0) {
      const selfPaying = points.find(
        (p) => p.incomeReinvest >= monthlyContribution,
      );
      if (selfPaying) {
        found.push({
          label: `Renda passa a cobrir o aporte de ${formatBRL(monthlyContribution)}`,
          month: selfPaying.month,
        });
      }
    }

    const firstIncome = points[0]?.incomeReinvest ?? 0;
    for (const target of MILESTONE_TARGETS) {
      if (target <= firstIncome) continue;
      const hit = points.find((p) => p.incomeReinvest >= target);
      if (hit) {
        found.push({
          label: `Renda mensal de ${formatBRL(target)}`,
          month: hit.month,
        });
      }
      if (found.length >= 5) break;
    }

    return found.sort((a, b) => a.month - b.month);
  }, [points, monthlyContribution]);

  const yearRows = useMemo(
    () => points.filter((p) => p.month % 12 === 0),
    [points],
  );

  const chartData = useMemo(() => {
    const step = totalMonths > 240 ? 3 : 1;
    return points
      .filter((p) => p.month % step === 0 || p.month === totalMonths)
      .map((p) => ({
        month: p.month,
        "Com reinvestimento": Math.round(p.incomeReinvest * 100) / 100,
        "Sem reinvestimento": Math.round(p.incomePlain * 100) / 100,
      }));
  }, [points, totalMonths]);

  const hasPortfolio = (data?.funds.length ?? 0) > 0;
  const hasCotaMode = data !== null;

  return (
    <div className="space-y-4">
      {/* Parâmetros */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-lg">
              Simulador de Renda com FIIs
            </CardTitle>
            {hasCotaMode && (
              <Tabs
                value={mode}
                onValueChange={(v) => setMode(v as "valor" | "cotas")}
              >
                <TabsList>
                  <TabsTrigger value="valor">Por valor (R$)</TabsTrigger>
                  <TabsTrigger value="cotas">Por cotas</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {mode === "valor" && (
              <div className="space-y-1.5">
                <Label htmlFor="sim-aporte">Aporte mensal (R$)</Label>
                <Input
                  id="sim-aporte"
                  type="number"
                  min="0"
                  step="50"
                  value={contribution}
                  onChange={(e) => setContribution(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Por quanto tempo</Label>
              <Select value={years} onValueChange={setYears}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEAR_OPTIONS.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y} {y === "1" ? "ano" : "anos"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {mode === "valor" && (
              <div className="space-y-1.5">
                <Label>Yield base (a.a.)</Label>
                <Select value={yieldBase} onValueChange={setYieldBase}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hasPortfolio && (
                      <SelectItem value="portfolio">
                        Carteira atual (
                        {(data?.summary.projected_yield ?? 0).toLocaleString(
                          "pt-BR",
                          { maximumFractionDigits: 1 },
                        )}
                        %)
                      </SelectItem>
                    )}
                    {data?.funds.map((fund) => (
                      <SelectItem key={fund.ticker} value={fund.ticker}>
                        {fund.ticker} (
                        {(fund.projected_yield ?? 0).toLocaleString("pt-BR", {
                          maximumFractionDigits: 1,
                        })}
                        %)
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {mode === "valor" && yieldBase === "custom" && (
              <div className="space-y-1.5">
                <Label htmlFor="sim-yield">Yield personalizado (%)</Label>
                <Input
                  id="sim-yield"
                  type="number"
                  min="0"
                  max="30"
                  step="0.1"
                  value={customYield}
                  onChange={(e) => setCustomYield(e.target.value)}
                />
              </div>
            )}

            <div className="flex items-end pb-1">
              <div className="flex items-center gap-2">
                <Switch
                  id="sim-carteira"
                  checked={includePortfolio}
                  onCheckedChange={setIncludePortfolio}
                  disabled={!hasPortfolio}
                />
                <Label
                  htmlFor="sim-carteira"
                  className="text-sm font-normal leading-tight"
                >
                  Partir da carteira atual
                  {data && hasPortfolio && (
                    <span className="block text-xs text-muted-foreground">
                      {mode === "cotas"
                        ? "suas cotas atuais entram na conta"
                        : `${formatBRL(data.summary.invested)} já investidos`}
                    </span>
                  )}
                </Label>
              </div>
            </div>
          </div>

          {/* Compras mensais por fundo (modo por cotas) */}
          {mode === "cotas" && (
            <div className="space-y-2 rounded-lg border border-border/60 p-3">
              <p className="text-sm font-medium">Compras por mês</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data?.funds.map((fund) => {
                  const cotaFund = cotaFunds.find(
                    (f) => f.ticker === fund.ticker,
                  );
                  return (
                    <div
                      key={fund.ticker}
                      className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <Badge variant="outline" className="font-mono">
                          {fund.ticker}
                        </Badge>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {cotaFund
                            ? `${formatBRL(cotaFund.price)}/cota · rende ${formatBRL(cotaFund.dividend)}/mês`
                            : "sem preço/distribuição"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          className="w-20 text-right"
                          value={buyQuantities[fund.ticker] ?? "0"}
                          onChange={(e) =>
                            setBuyQuantities((prev) => ({
                              ...prev,
                              [fund.ticker]: e.target.value,
                            }))
                          }
                        />
                        <span className="text-xs text-muted-foreground">
                          /mês
                        </span>
                      </div>
                    </div>
                  );
                })}

                {extraFunds.map((fund) => (
                  <div
                    key={fund.ticker}
                    className="flex items-center justify-between gap-3 rounded-md border border-dashed border-primary/40 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="font-mono">
                          {fund.ticker}
                        </Badge>
                        <span className="text-[10px] uppercase tracking-wider text-primary">
                          simulação
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatBRL(fund.price)}/cota · rende{" "}
                        {formatBRL(fund.dividend)}/mês
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        className="w-20 text-right"
                        value={buyQuantities[fund.ticker] ?? "0"}
                        onChange={(e) =>
                          setBuyQuantities((prev) => ({
                            ...prev,
                            [fund.ticker]: e.target.value,
                          }))
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeExtraFund(fund.ticker)}
                        title="Remover da simulação"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Adicionar FII de fora da carteira */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Input
                  placeholder="Adicionar FII (ex: MXRF11)"
                  className="w-48 uppercase"
                  value={lookupTicker}
                  onChange={(e) => setLookupTicker(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addExtraFund();
                    }
                  }}
                  disabled={lookingUp}
                />
                <Button
                  variant="outline"
                  onClick={addExtraFund}
                  disabled={lookingUp || !lookupTicker.trim()}
                >
                  {lookingUp ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Adicionar
                </Button>
                <span className="text-xs text-muted-foreground">
                  Qualquer FII da bolsa, mesmo fora da sua carteira
                </span>
              </div>

              <p className="text-sm">
                Isso equivale a um aporte de{" "}
                <span className="font-semibold text-primary">
                  {formatBRL(monthlyContribution)}/mês
                </span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resultado no fim do período */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Renda Mensal Final
            </CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatBRL(last?.incomeReinvest ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Reinvestindo · sem reinvestir:{" "}
              {formatBRL(last?.incomePlain ?? 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Patrimônio Final
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBRL(last?.capitalReinvest ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Em {years} {years === "1" ? "ano" : "anos"}, reinvestindo tudo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Saiu do Seu Bolso
            </CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBRL(last?.contributed ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {includePortfolio && hasPortfolio
                ? "Carteira atual + aportes"
                : "Total de aportes"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Proventos no Período
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[color:var(--success)]">
              {formatBRL(totalIncomeReceived)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Tudo que os FIIs te pagariam no caminho
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cotas acumuladas no fim (modo por cotas) */}
      {mode === "cotas" && cotaFunds.length > 0 && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 py-3 text-sm">
            <span className="text-muted-foreground">
              Cotas no fim do período (reinvestindo):
            </span>
            {cotaFunds.map((fund, index) => (
              <Badge key={fund.ticker} variant="secondary" className="font-mono">
                {fund.ticker} ×{" "}
                {cotaResult.finalQuantities[index]?.toLocaleString("pt-BR")}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Evolução da renda mensal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Evolução da Renda Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                tickFormatter={(m: number) =>
                  m % 12 === 0 ? `${m / 12}a` : ""
                }
                interval={0}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v: number) =>
                  v >= 1000
                    ? `R$${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`
                    : `R$${v}`
                }
                className="text-muted-foreground"
                width={70}
              />
              <Tooltip content={<SimTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="Com reinvestimento"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="Sem reinvestimento"
                stroke="var(--chart-2)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Marcos */}
      {milestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Flag className="h-5 w-5 text-primary" />
              Marcos no Caminho
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {milestones.map((milestone) => (
                <div
                  key={milestone.label}
                  className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm"
                >
                  <span>{milestone.label}</span>
                  <span className="font-medium text-primary">
                    em {formatMonths(milestone.month)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ano a ano */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ano a Ano (reinvestindo)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Ano</th>
                <th className="py-2 pr-4 font-medium">Do seu bolso</th>
                <th className="py-2 pr-4 font-medium">Patrimônio</th>
                <th className="py-2 font-medium text-right">Renda mensal</th>
              </tr>
            </thead>
            <tbody>
              {yearRows.map((row) => (
                <tr key={row.month} className="border-b border-border/50">
                  <td className="py-2 pr-4">{row.month / 12}º</td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {formatBRL(row.contributed)}
                  </td>
                  <td className="py-2 pr-4">
                    {formatBRL(row.capitalReinvest)}
                  </td>
                  <td className="py-2 text-right font-medium text-primary">
                    {formatBRL(row.incomeReinvest)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        {mode === "cotas"
          ? "Simulação simplificada: preço de cota e distribuição média (12m) constantes. No reinvestimento, os proventos acumulam em caixa e compram cotas inteiras do fundo com melhor rendimento por real investido; a sobra segue para o mês seguinte. "
          : `Simulação simplificada: yield constante de ${annualYield.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% a.a. sobre o valor investido. `}
        Não considera valorização das cotas, variação das distribuições nem
        inflação. FIIs são isentos de IR sobre rendimentos para pessoa física,
        então a renda mostrada é líquida.
      </p>
    </div>
  );
};
