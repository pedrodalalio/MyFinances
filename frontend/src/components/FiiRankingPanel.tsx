import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Award,
  Filter,
  RefreshCw,
  TrendingDown,
  Trophy,
} from "lucide-react";
import { api } from "@/utils/api";
import { queryKeys } from "@/lib/query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface FiiRankingEntry {
  rank: number;
  ticker: string;
  segment: string;
  price: number;
  pvp: number;
  liquidity: number;
  vacancy: number;
  avg_per_share_12m: number;
  monthly_yield_pct: number;
  annual_yield_pct: number;
  months_paid_12m: number;
  history_months: number;
  price_change_12m_pct: number | null;
  amortization_share_pct: number;
  dividend_trend_pct: number | null;
  score: number;
  score_breakdown: {
    yield: number;
    consistency: number;
    dividend_stability: number;
    price_stability: number;
    pvp: number;
    liquidity: number;
    track_record: number;
    amortization_penalty: number;
    dividend_trend_penalty: number;
  };
  flags: string[];
  source: string;
  owned: boolean;
}

interface FiiRankingData {
  ranking: FiiRankingEntry[];
  universe: { total: number; eligible: number; analyzed: number };
  criteria: {
    min_liquidity: number;
    pvp_range: [number, number];
    candidates: number;
  };
  requestedAt: string;
}

const formatBRL = (value: number): string =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatCompactBRL = (value: number): string => {
  if (value >= 1_000_000)
    return `R$ ${(value / 1_000_000).toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    })} mi`;
  if (value >= 1_000)
    return `R$ ${Math.round(value / 1_000).toLocaleString("pt-BR")} mil`;
  return formatBRL(value);
};

const formatPct = (value: number, digits = 2): string =>
  `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;

const FLAG_LABELS: Record<string, { label: string; title: string }> = {
  amortizacao: {
    label: "amortização",
    title:
      "Parte relevante dos proventos foi devolução do próprio capital (amortização), o que infla o yield.",
  },
  queda_preco: {
    label: "cota em queda",
    title:
      "A cota caiu mais de 15% em 12 meses — o mercado pode estar devolvendo o yield via desvalorização.",
  },
  pagamento_irregular: {
    label: "pagamento irregular",
    title: "Não pagou rendimento em todos os últimos 12 meses.",
  },
  sem_historico_preco: {
    label: "sem histórico de preço",
    title:
      "Não foi possível obter a variação da cota em 12m; a nota usa valor neutro nesse critério.",
  },
  baixa_liquidez: {
    label: "baixa liquidez",
    title:
      "Volume negociado abaixo de R$ 300 mil/dia — pode ser difícil montar ou desmontar posição sem mexer no preço.",
  },
  fundo_novo: {
    label: "fundo novo",
    title:
      "Menos de 18 meses de histórico de proventos: ainda não passou por um ciclo de juros/estresse de crédito.",
  },
  provento_em_queda: {
    label: "provento em queda",
    title:
      "A média de rendimento dos últimos 6 meses está mais de 8% abaixo dos 6 meses anteriores — sinal de carteira deteriorando (ex.: inadimplência num CRI).",
  },
};

const scoreBadgeClass = (score: number): string => {
  if (score >= 75)
    return "bg-[color:var(--success)]/15 text-[color:var(--success)] border-[color:var(--success)]/30";
  if (score >= 55) return "bg-primary/10 text-primary border-primary/30";
  return "bg-muted text-muted-foreground border-border";
};

const scoreTitle = (entry: FiiRankingEntry): string => {
  const b = entry.score_breakdown;
  // Tolera dado parcial (ex.: cache antigo do backend sem os campos novos).
  const n = (value: number | undefined): string =>
    (value ?? 0).toLocaleString("pt-BR");
  return [
    `Yield mensal: ${n(b.yield)}/30`,
    `Consistência: ${n(b.consistency)}/15`,
    `Estabilidade do provento: ${n(b.dividend_stability)}/12`,
    `Estabilidade do preço: ${n(b.price_stability)}/13`,
    `P/VP: ${n(b.pvp)}/10`,
    `Liquidez: ${n(b.liquidity)}/10`,
    `Track record: ${n(b.track_record)}/10`,
    `Penalidade amortização: ${n(b.amortization_penalty)}`,
    `Penalidade provento em queda: ${n(b.dividend_trend_penalty)}`,
  ].join("\n");
};

export const FiiRankingPanel = () => {
  const { data, isPending, isError, refetch, isFetching } =
    useQuery<FiiRankingData>({
      queryKey: queryKeys.fiiRanking,
      queryFn: async () =>
        // A primeira carga varre ~30 fundos e pode levar ~30s; o timeout
        // global do axios (10s) estouraria e cairia no estado de erro mesmo
        // com o backend ainda trabalhando. 60s cobre o scraping com folga.
        (await api.get("/investments/fii-ranking", { timeout: 60_000 })).data,
      // O backend faz scraping de ~30 fundos na primeira carga (depois fica
      // 6h em cache no servidor); não vale refazer a cada navegação.
      staleTime: 30 * 60 * 1000,
      retry: false,
    });

  if (isPending) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="font-medium">Analisando o mercado de FIIs...</p>
          <p className="text-sm text-muted-foreground max-w-md">
            Varrendo todos os fundos da bolsa e analisando a fundo os melhores
            candidatos (proventos, consistência e histórico de preço). A
            primeira carga pode levar até ~30 segundos; depois fica em cache.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <AlertTriangle className="h-8 w-8 text-[color:var(--warning)]" />
          <p className="text-muted-foreground">
            Não foi possível montar o ranking agora. As fontes públicas podem
            estar temporariamente fora do ar.
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  const top3 = data.ranking.slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Como o ranking funciona */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Filter className="h-4 w-4 shrink-0" />
            {data.universe.total} FIIs na bolsa → {data.universe.eligible}{" "}
            passaram nos filtros (liquidez ≥{" "}
            {formatBRL(data.criteria.min_liquidity)}/dia, P/VP sadio) →{" "}
            {data.universe.analyzed} analisados a fundo
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
            Atualizar
          </Button>
        </CardContent>
      </Card>

      {/* Pódio */}
      <div className="grid gap-4 md:grid-cols-3">
        {top3.map((entry) => (
          <Card
            key={entry.ticker}
            className={
              entry.rank === 1
                ? "border-[color:var(--success)]/40 bg-[color:var(--success)]/[0.04]"
                : ""
            }
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                {entry.rank === 1 ? (
                  <Trophy className="h-4 w-4 text-[color:var(--success)]" />
                ) : (
                  <Award className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-mono">{entry.ticker}</span>
                {entry.owned && <Badge variant="secondary">na carteira</Badge>}
              </CardTitle>
              <Badge
                variant="outline"
                className={scoreBadgeClass(entry.score)}
                title={scoreTitle(entry)}
              >
                {entry.score.toLocaleString("pt-BR", {
                  maximumFractionDigits: 0,
                })}{" "}
                pts
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {formatPct(entry.monthly_yield_pct)} a.m.
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {entry.avg_per_share_12m.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 4,
                })}
                /cota sobre {formatBRL(entry.price)} · {entry.segment}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabela completa */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Melhor retorno por real investido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="p-2 font-medium">#</th>
                  <th className="p-2 font-medium">Fundo</th>
                  <th className="p-2 font-medium text-right">Cotação</th>
                  <th className="p-2 font-medium text-right">R$/cota (12m)</th>
                  <th
                    className="p-2 font-medium text-right"
                    title="Rendimento médio mensal dividido pelo preço da cota: quanto cada real investido devolve por mês"
                  >
                    Yield a.m.
                  </th>
                  <th className="p-2 font-medium text-right">Yield a.a.</th>
                  <th
                    className="p-2 font-medium text-right"
                    title="Preço / valor patrimonial: abaixo de 1 você paga menos que o patrimônio da cota"
                  >
                    P/VP
                  </th>
                  <th
                    className="p-2 font-medium text-right"
                    title="Volume médio negociado por dia: quanto mais alto, mais fácil comprar e vender sem mexer no preço"
                  >
                    Liquidez
                  </th>
                  <th
                    className="p-2 font-medium text-right"
                    title="Meses com rendimento pago nos últimos 12"
                  >
                    Pagou
                  </th>
                  <th className="p-2 font-medium text-right">Cota 12m</th>
                  <th className="p-2 font-medium text-right">Score</th>
                  <th className="p-2 font-medium">Avisos</th>
                </tr>
              </thead>
              <tbody>
                {data.ranking.map((entry) => (
                  <tr
                    key={entry.ticker}
                    className="border-b border-border/50 last:border-0 hover:bg-accent/40"
                  >
                    <td className="p-2 text-muted-foreground">{entry.rank}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">
                          {entry.ticker}
                        </span>
                        {entry.owned && (
                          <Badge variant="secondary" className="text-[10px]">
                            na carteira
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {entry.segment}
                      </span>
                    </td>
                    <td className="p-2 text-right">{formatBRL(entry.price)}</td>
                    <td className="p-2 text-right">
                      {entry.avg_per_share_12m.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 4,
                      })}
                    </td>
                    <td className="p-2 text-right font-semibold text-primary">
                      {formatPct(entry.monthly_yield_pct)}
                    </td>
                    <td className="p-2 text-right">
                      {formatPct(entry.annual_yield_pct, 1)}
                    </td>
                    <td className="p-2 text-right">
                      {entry.pvp.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td
                      className={`p-2 text-right ${
                        entry.liquidity < 300_000
                          ? "text-[color:var(--warning)]"
                          : "text-muted-foreground"
                      }`}
                      title={`${formatBRL(entry.liquidity)}/dia`}
                    >
                      {formatCompactBRL(entry.liquidity)}
                    </td>
                    <td className="p-2 text-right">
                      {entry.months_paid_12m}/12
                    </td>
                    <td
                      className={`p-2 text-right ${
                        entry.price_change_12m_pct === null
                          ? "text-muted-foreground"
                          : entry.price_change_12m_pct >= 0
                            ? "text-[color:var(--success)]"
                            : "text-destructive"
                      }`}
                    >
                      {entry.price_change_12m_pct !== null
                        ? `${entry.price_change_12m_pct >= 0 ? "+" : ""}${formatPct(entry.price_change_12m_pct, 1)}`
                        : "—"}
                    </td>
                    <td className="p-2 text-right">
                      <Badge
                        variant="outline"
                        className={scoreBadgeClass(entry.score)}
                        title={scoreTitle(entry)}
                      >
                        {entry.score.toLocaleString("pt-BR", {
                          maximumFractionDigits: 0,
                        })}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {entry.flags.map((flag) => {
                          const info = FLAG_LABELS[flag];
                          if (!info) return null;
                          return (
                            <Badge
                              key={flag}
                              variant="outline"
                              className="border-[color:var(--warning)]/40 text-[color:var(--warning)] text-[10px]"
                              title={info.title}
                            >
                              <TrendingDown className="mr-1 h-3 w-3" />
                              {info.label}
                            </Badge>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        O score (0–100) combina rendimento mensal por real investido (30),
        consistência de pagamento (15), estabilidade do provento (12),
        estabilidade da cota em 12m (13), P/VP (10), liquidez (10) e track
        record/idade do fundo (10), com penalidades para amortização (devolução
        de capital) e para provento em queda (sinal de carteira deteriorando).
        Passe o mouse no score para ver o detalhamento. Fontes públicas
        (Fundamentus, StatusInvest, Yahoo Finance) com cache de 6h. Ferramenta
        de apoio à decisão — não é recomendação de investimento; rentabilidade
        passada não garante rendimento futuro.
      </p>
    </div>
  );
};
