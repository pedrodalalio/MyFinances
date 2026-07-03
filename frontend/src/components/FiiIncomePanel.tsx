import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Coins,
  CalendarClock,
  TrendingUp,
  Percent,
  RefreshCw,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import { api } from "@/utils/api";
import { queryKeys } from "@/lib/query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface FiiPayment {
  ex_date: string;
  payment_date: string | null;
  value_per_share: number;
  total: number;
  type: string;
}

export interface FiiFundForecast {
  ticker: string;
  quantity: number;
  invested: number;
  source: string;
  first_purchase_date: string | null;
  last_payment: FiiPayment | null;
  next_payment: FiiPayment | null;
  avg_per_share_12m: number;
  monthly_forecast: number;
  annual_forecast: number;
  received_12m: number;
  received_total: number;
  yield_on_cost_12m: number | null;
  projected_yield: number | null;
  next_ex_date: string | null;
  next_ex_date_is_estimate: boolean;
  typical_ex_day: number | null;
  history_12m: Array<{ month: string; value_per_share: number; total: number }>;
}

export interface FiiIncomeData {
  funds: FiiFundForecast[];
  summary: {
    monthly_forecast: number;
    annual_forecast: number;
    invested: number;
    received_12m: number;
    yield_on_cost_12m: number | null;
    received_total: number;
    projected_yield: number | null;
    next_payments: Array<FiiPayment & { ticker: string }>;
    next_payments_total: number;
  };
  notFound: string[];
  requestedAt: string;
}

export const formatBRL = (value: number): string =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const MONTH_SHORT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

/** "2026-03" → "mar/26" */
const formatMonth = (month: string): string => {
  const [year, m] = month.split("-");
  return `${MONTH_SHORT[parseInt(m) - 1] ?? m}/${year.slice(-2)}`;
};

/** "2026-07-14" → "14/07/2026" */
export const formatISODate = (iso: string | null): string => {
  if (!iso) return "data não divulgada";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
};

const SOURCE_LABELS: Record<string, string> = {
  statusinvest: "StatusInvest",
  fundamentus: "Fundamentus",
  yahoo: "Yahoo Finance",
};

const HistoryTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { value_per_share: number } }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs shadow-md">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">
        {formatBRL(payload[0].value)} ·{" "}
        {payload[0].payload.value_per_share.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 4,
        })}
        /cota
      </p>
    </div>
  );
};

export const FiiIncomePanel = () => {
  const { data, isPending, isError, refetch } = useQuery<FiiIncomeData>({
    queryKey: queryKeys.fiiIncome,
    queryFn: async () => (await api.get("/investments/fii-income")).data,
  });

  if (isPending) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-muted rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <AlertTriangle className="h-8 w-8 text-[color:var(--warning)]" />
          <p className="text-muted-foreground">
            Não foi possível buscar os proventos agora. As fontes públicas
            podem estar temporariamente fora do ar.
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (data.funds.length === 0 && data.notFound.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Coins className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum FII encontrado</h3>
          <p className="text-muted-foreground text-center">
            Cadastre investimentos do tipo FII com o campo ticker preenchido
            (ex: MXRF11) para ver a previsão de proventos aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { summary } = data;

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Renda Mensal Estimada
            </CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatBRL(summary.monthly_forecast)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Média 12m × suas cotas ·{" "}
              {formatBRL(summary.annual_forecast)}/ano
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Investido em FIIs
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBRL(summary.invested)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.funds.length}{" "}
              {data.funds.length === 1 ? "fundo" : "fundos"} ·{" "}
              {data.funds
                .reduce((sum, fund) => sum + fund.quantity, 0)
                .toLocaleString("pt-BR")}{" "}
              cotas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Recebido
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBRL(summary.received_total)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Desde as compras · últimos 12m:{" "}
              {formatBRL(summary.received_12m)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Yield Projetado (a.a.)
            </CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.projected_yield !== null
                ? `${summary.projected_yield.toLocaleString("pt-BR", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}%`
                : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              No ritmo atual de distribuição · já retornou{" "}
              {summary.invested > 0
                ? `${((summary.received_total / summary.invested) * 100).toLocaleString(
                    "pt-BR",
                    { minimumFractionDigits: 1, maximumFractionDigits: 1 },
                  )}%`
                : "0%"}{" "}
              do investido
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Próximos pagamentos anunciados */}
      {summary.next_payments.length > 0 && (
        <Card className="border-[color:var(--success)]/30 bg-[color:var(--success)]/[0.04]">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-[color:var(--success)]" />
              Dinheiro a caminho
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.next_payments.map((payment) => (
                <div
                  key={`${payment.ticker}-${payment.ex_date}`}
                  className="flex items-center justify-between rounded-md border border-border/60 bg-card px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono">
                      {payment.ticker}
                    </Badge>
                    <span className="text-muted-foreground">
                      paga em{" "}
                      <span className="font-medium text-foreground">
                        {formatISODate(payment.payment_date)}
                      </span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-[color:var(--success)]">
                      {formatBRL(payment.total)}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {payment.value_per_share.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 4,
                      })}
                      /cota
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Valores já aprovados pelos fundos (não são previsão). A data-com
              já passou; basta aguardar o crédito.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tickers não encontrados */}
      {data.notFound.length > 0 && (
        <Card className="border-[color:var(--warning)]/40">
          <CardContent className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 shrink-0 text-[color:var(--warning)]" />
            Não achei proventos para: {data.notFound.join(", ")}. Confira se o
            ticker está correto no cadastro do investimento.
          </CardContent>
        </Card>
      )}

      {/* Detalhe por fundo */}
      <div className="grid gap-4 lg:grid-cols-2">
        {data.funds.map((fund) => (
          <Card key={fund.ticker}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span className="font-mono">{fund.ticker}</span>
                  <Badge variant="secondary">
                    {fund.quantity.toLocaleString("pt-BR")} cotas
                  </Badge>
                </CardTitle>
                <span
                  className="text-[10px] uppercase tracking-wider text-muted-foreground"
                  title="Fonte dos dados de proventos"
                >
                  {SOURCE_LABELS[fund.source] ?? fund.source}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-border/60 p-2.5">
                  <p className="text-xs text-muted-foreground">
                    Próximo pagamento
                  </p>
                  {fund.next_payment ? (
                    <>
                      <p className="font-semibold text-[color:var(--success)]">
                        {formatBRL(fund.next_payment.total)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        em {formatISODate(fund.next_payment.payment_date)}
                      </p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">ainda não anunciado</p>
                  )}
                </div>
                <div className="rounded-lg border border-border/60 p-2.5">
                  <p className="text-xs text-muted-foreground">
                    Previsão mensal
                  </p>
                  <p className="font-semibold text-primary">
                    {formatBRL(fund.monthly_forecast)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fund.avg_per_share_12m.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 4,
                    })}
                    /cota em média
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 p-2.5">
                  <p className="text-xs text-muted-foreground">
                    Total recebido até hoje
                  </p>
                  <p className="font-semibold">
                    {formatBRL(fund.received_total)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fund.first_purchase_date
                      ? `desde a compra em ${formatISODate(fund.first_purchase_date)}`
                      : "desde a compra"}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 p-2.5">
                  <p className="text-xs text-muted-foreground">
                    Recebido em 12m
                  </p>
                  <p className="font-semibold">{formatBRL(fund.received_12m)}</p>
                  <p className="text-xs text-muted-foreground">
                    Previsão anual: {formatBRL(fund.annual_forecast)}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 p-2.5">
                  <p className="text-xs text-muted-foreground">
                    Yield projetado (a.a.)
                  </p>
                  <p className="font-semibold">
                    {fund.projected_yield !== null
                      ? `${fund.projected_yield.toLocaleString("pt-BR", {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}%`
                      : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    sobre {formatBRL(fund.invested)} investidos
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 p-2.5">
                  <p className="text-xs text-muted-foreground">
                    Compre até (data-com)
                  </p>
                  <p className="font-semibold">
                    {fund.next_ex_date
                      ? formatISODate(fund.next_ex_date)
                      : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fund.next_ex_date
                      ? fund.next_ex_date_is_estimate
                        ? `estimativa · costuma ser ~dia ${fund.typical_ex_day}`
                        : "data-com já anunciada pelo fundo"
                      : "sem histórico suficiente"}
                  </p>
                </div>
              </div>

              {fund.history_12m.length > 0 && (
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">
                    Proventos recebidos por mês (R$)
                  </p>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart
                      data={fund.history_12m.map((h) => ({
                        ...h,
                        label: formatMonth(h.month),
                      }))}
                      margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
                      barCategoryGap="25%"
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        className="opacity-30"
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                        className="text-muted-foreground"
                      />
                      <YAxis hide domain={[0, "auto"]} />
                      <Tooltip
                        content={<HistoryTooltip />}
                        cursor={{ fill: "var(--accent)", opacity: 0.4 }}
                      />
                      <Bar
                        dataKey="total"
                        fill="var(--chart-1)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={22}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {fund.last_payment && (
                <p className="text-xs text-muted-foreground">
                  Último pagamento: {formatBRL(fund.last_payment.total)} em{" "}
                  {formatISODate(fund.last_payment.payment_date)}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Fontes públicas (StatusInvest, Fundamentus, Yahoo Finance), com cache
        de 6h. A previsão usa a média dos últimos 12 meses e não é garantia de
        rendimento futuro. Comprar até a data-com garante o provento daquele
        mês (a partir do dia seguinte a cota já negocia "ex", com o preço
        descontando o valor distribuído).
      </p>
    </div>
  );
};
