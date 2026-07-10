import { InvestmentRepository } from '@/repositories/investment-repository'
import {
  fetchFiiMarket,
  fetchPriceChange12m,
  FiiMarketEntry,
} from '@/lib/fii-market'
import { fetchManyFiiDividends, FiiDividend } from '@/lib/fii-dividends'

// Ranking do mercado inteiro de FIIs focado em "retorno por real investido":
// quanto cada R$ 1,00 aplicado devolve por mês, com filtros contra os dois
// falsos positivos clássicos de yield alto — amortização disfarçada de
// rendimento e cota derretendo enquanto o fundo distribui.

interface GetFiiRankingServiceRequest {
  userId: string
}

export interface FiiRankingEntry {
  rank: number
  ticker: string
  segment: string
  price: number
  pvp: number
  /** Volume médio negociado por dia, em R$ */
  liquidity: number
  vacancy: number
  /** Rendimento médio mensal por cota (só tipo Rendimento), últimos 12m */
  avg_per_share_12m: number
  /** Rendimento mensal por real investido, em % a.m. (a métrica central) */
  monthly_yield_pct: number
  /** monthly_yield_pct × 12 */
  annual_yield_pct: number
  /** Meses com rendimento pago nos últimos 12 (12/12 = pagou todo mês) */
  months_paid_12m: number
  /** Meses de histórico de proventos desde o primeiro pagamento */
  history_months: number
  /** Variação da cota em 12m, em % (null = sem histórico no Yahoo) */
  price_change_12m_pct: number | null
  /** Fatia dos proventos 12m que foi amortização (devolução de capital), em % */
  amortization_share_pct: number
  /** Variação do provento (média 6m recentes vs 6m anteriores), em %.
   *  Negativo = provento em queda; null = histórico curto demais para medir. */
  dividend_trend_pct: number | null
  /** Nota 0–100 combinando yield, consistência e estabilidade */
  score: number
  score_breakdown: {
    yield: number
    consistency: number
    dividend_stability: number
    price_stability: number
    pvp: number
    liquidity: number
    track_record: number
    amortization_penalty: number
    dividend_trend_penalty: number
  }
  /** Avisos para exibir na UI (ex: 'amortizacao', 'queda_preco') */
  flags: string[]
  /** Fonte do histórico de proventos */
  source: string
  /** true se o usuário já tem esse fundo na carteira */
  owned: boolean
}

interface GetFiiRankingServiceResponse {
  ranking: FiiRankingEntry[]
  universe: {
    /** Total de FIIs listados na bolsa */
    total: number
    /** Quantos passaram nos filtros de liquidez/P/VP */
    eligible: number
    /** Quantos foram analisados a fundo (proventos + histórico de preço) */
    analyzed: number
  }
  criteria: {
    min_liquidity: number
    pvp_range: [number, number]
    candidates: number
  }
  requestedAt: string
}

export class FiiMarketUnavailableError extends Error {
  constructor() {
    super('Fonte de dados do mercado de FIIs indisponível no momento')
    this.name = 'FiiMarketUnavailableError'
  }
}

// Filtros eliminatórios: abaixo disso não dá nem para analisar.
const MIN_LIQUIDITY = 100_000 // R$/dia — menos que isso é difícil comprar/vender
const MIN_MARKET_VALUE = 50_000_000 // fundos micro distorcem indicadores
const PVP_RANGE: [number, number] = [0.4, 2] // fora disso o dado está quebrado

// Nota de liquidez: escala log do piso (nota 0) ao conforto (nota cheia).
// Escala log porque a liquidez varia em ordens de grandeza (100k → 4M).
const LIQUIDITY_COMFORT = 1_000_000 // R$/dia para nota cheia de liquidez
const LOW_LIQUIDITY = 300_000 // abaixo disso, aviso de baixa liquidez
// Track record: meses de histórico de proventos para nota cheia. Fundo com
// menos que NEW_FUND_MONTHS de vida ainda não passou por um ciclo de estresse.
const TRACK_RECORD_TARGET = 24
const NEW_FUND_MONTHS = 18
// Quantos candidatos pré-selecionados por DY recebem análise profunda
// (cada um custa ~2 requests a fontes externas).
const CANDIDATES = 30

// O ranking final é igual para todos os usuários (só a flag `owned` muda),
// então o resultado caro (scraping de 30 fundos) fica em cache no módulo.
const RANKING_CACHE_TTL_MS = 6 * 60 * 60 * 1000
let rankingCache: {
  fetchedAt: number
  ranking: Omit<FiiRankingEntry, 'owned'>[]
  universe: GetFiiRankingServiceResponse['universe']
} | null = null

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function isAmortization(dividend: FiiDividend): boolean {
  return dividend.type.toLowerCase().includes('amortiza')
}

/** Executa tarefas com concorrência limitada, preservando a ordem. */
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  task: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0

  async function worker() {
    while (next < items.length) {
      const index = next++
      results[index] = await task(items[index])
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  )

  return results
}

interface ScoredCandidate extends Omit<FiiRankingEntry, 'rank' | 'owned'> {}

export function scoreCandidate(
  entry: FiiMarketEntry,
  dividends: FiiDividend[],
  source: string,
  priceChange12m: number | null
): ScoredCandidate | null {
  const today = new Date().toISOString().slice(0, 10)
  const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const window = dividends.filter(
    (d) =>
      d.exDate >= yearAgo &&
      (d.paymentDate ? d.paymentDate <= today : d.exDate <= today)
  )
  if (window.length === 0) return null

  const income = window.filter((d) => !isAmortization(d))
  const totalDistributed = window.reduce((sum, d) => sum + d.value, 0)
  const totalAmortization = window
    .filter(isAmortization)
    .reduce((sum, d) => sum + d.value, 0)
  const amortizationShare =
    totalDistributed > 0 ? totalAmortization / totalDistributed : 0

  // Rendimento agregado por mês (alguns fundos pagam mais de uma vez no mês).
  const byMonth = new Map<string, number>()
  for (const dividend of income) {
    const month = dividend.exDate.slice(0, 7)
    byMonth.set(month, (byMonth.get(month) ?? 0) + dividend.value)
  }
  const monthsPaid = byMonth.size
  if (monthsPaid === 0) return null

  const monthlyValues = Array.from(byMonth.values())
  const avgPerShare =
    monthlyValues.reduce((sum, v) => sum + v, 0) / monthsPaid

  // Coeficiente de variação: 0 = pagou sempre o mesmo valor; quanto maior,
  // mais imprevisível a renda (0,05/0,30/0,02 pontua mal mesmo com boa média).
  const variance =
    monthlyValues.reduce((sum, v) => sum + (v - avgPerShare) ** 2, 0) /
    monthsPaid
  const cv = avgPerShare > 0 ? Math.sqrt(variance) / avgPerShare : 1

  const monthlyYield = (avgPerShare / entry.price) * 100

  // Histórico completo de rendimentos (além da janela de 12m), agregado por
  // mês e do mais recente para o mais antigo — base para idade e tendência.
  const incomeByMonthAll = new Map<string, number>()
  for (const dividend of dividends) {
    if (isAmortization(dividend)) continue
    if (dividend.exDate > today) continue // ignora proventos já anunciados p/ o futuro
    const month = dividend.exDate.slice(0, 7)
    incomeByMonthAll.set(month, (incomeByMonthAll.get(month) ?? 0) + dividend.value)
  }
  const monthsDesc = Array.from(incomeByMonthAll.keys()).sort().reverse()

  // Idade: meses desde o primeiro provento pago. Fundo novo ainda não passou
  // por um ciclo de juros/estresse de crédito — "12/12 pagou" vale menos.
  const firstMonth = monthsDesc[monthsDesc.length - 1]
  const historyMonths = firstMonth
    ? Math.max(
        1,
        Math.round(
          (Date.now() - new Date(`${firstMonth}-01`).getTime()) /
            (30 * 24 * 60 * 60 * 1000)
        )
      )
    : monthsPaid

  // Tendência do provento: média dos 6 meses recentes vs os 6 anteriores.
  // Provento em queda suave passa despercebido pelo CV (que só vê dispersão),
  // mas é o jeito que deterioração de carteira/calote aparece na prática.
  let dividendTrend: number | null = null
  if (monthsDesc.length >= 8) {
    const recent = monthsDesc.slice(0, 6).map((m) => incomeByMonthAll.get(m)!)
    const prior = monthsDesc.slice(6, 12).map((m) => incomeByMonthAll.get(m)!)
    if (prior.length >= 3) {
      const recentAvg = recent.reduce((s, v) => s + v, 0) / recent.length
      const priorAvg = prior.reduce((s, v) => s + v, 0) / prior.length
      if (priorAvg > 0) dividendTrend = (recentAvg - priorAvg) / priorAvg
    }
  }

  // --- Score (0–100) ---

  // Yield (30): a métrica central — 0,5% a.m. vale 0, 1,2% a.m. vale nota cheia.
  const yieldScore = Math.min(Math.max((monthlyYield - 0.5) / 0.7, 0), 1) * 30

  // Consistência (15): pagou em quantos dos últimos 12 meses.
  const consistencyScore = (Math.min(monthsPaid, 12) / 12) * 15

  // Estabilidade do provento (12): CV de 0,4+ zera (renda imprevisível).
  const dividendStabilityScore = (1 - Math.min(cv / 0.4, 1)) * 12

  // Estabilidade do preço (13): só queda penaliza (yield alto com cota
  // derretendo é o mercado devolvendo o rendimento); -20% em 12m zera.
  // Sem histórico, fica no meio-termo em vez de premiar ou punir às cegas.
  const priceDrop = priceChange12m !== null ? Math.max(0, -priceChange12m) : null
  const priceStabilityScore =
    priceDrop !== null ? (1 - Math.min(priceDrop / 20, 1)) * 13 : 6.5

  // P/VP (10): pagar menos pelo mesmo rendimento é melhor, mas desconto
  // extremo é sinal de problema. Nota cheia entre 0,70 e 1,05, caindo até
  // zerar em 0,45 e 1,40.
  let pvpScore: number
  if (entry.pvp >= 0.7 && entry.pvp <= 1.05) {
    pvpScore = 10
  } else if (entry.pvp < 0.7) {
    pvpScore = Math.max(0, (entry.pvp - 0.45) / 0.25) * 10
  } else {
    pvpScore = Math.max(0, (1.4 - entry.pvp) / 0.35) * 10
  }

  // Liquidez (10): passar no filtro não basta — perto do piso é difícil
  // montar/desmontar posição. Escala log de MIN_LIQUIDITY a LIQUIDITY_COMFORT.
  const liquidityScore =
    entry.liquidity > 0
      ? Math.min(
          Math.max(
            Math.log(entry.liquidity / MIN_LIQUIDITY) /
              Math.log(LIQUIDITY_COMFORT / MIN_LIQUIDITY),
            0
          ),
          1
        ) * 10
      : 0

  // Track record (10): meses de histórico até TRACK_RECORD_TARGET.
  const trackRecordScore = Math.min(historyMonths / TRACK_RECORD_TARGET, 1) * 10

  // Amortização (penalidade até -20): devolver capital infla o yield.
  const amortizationPenalty = amortizationShare * 20

  // Provento em queda (penalidade até -15): -20% ou mais na média recente zera.
  const dividendTrendPenalty =
    dividendTrend !== null && dividendTrend < 0
      ? Math.min(-dividendTrend / 0.2, 1) * 15
      : 0

  const score = Math.max(
    0,
    yieldScore +
      consistencyScore +
      dividendStabilityScore +
      priceStabilityScore +
      pvpScore +
      liquidityScore +
      trackRecordScore -
      amortizationPenalty -
      dividendTrendPenalty
  )

  const flags: string[] = []
  if (amortizationShare > 0.15) flags.push('amortizacao')
  if (priceChange12m !== null && priceChange12m < -15) flags.push('queda_preco')
  if (monthsPaid < 10) flags.push('pagamento_irregular')
  if (priceChange12m === null) flags.push('sem_historico_preco')
  if (entry.liquidity < LOW_LIQUIDITY) flags.push('baixa_liquidez')
  if (historyMonths < NEW_FUND_MONTHS) flags.push('fundo_novo')
  if (dividendTrend !== null && dividendTrend < -0.08)
    flags.push('provento_em_queda')

  return {
    ticker: entry.ticker,
    segment: entry.segment,
    price: entry.price,
    pvp: entry.pvp,
    liquidity: Math.round(entry.liquidity),
    vacancy: entry.vacancy,
    avg_per_share_12m: round2(avgPerShare * 100) / 100,
    monthly_yield_pct: round2(monthlyYield),
    annual_yield_pct: round2(monthlyYield * 12),
    months_paid_12m: Math.min(monthsPaid, 12),
    history_months: historyMonths,
    price_change_12m_pct:
      priceChange12m !== null ? round2(priceChange12m) : null,
    amortization_share_pct: round2(amortizationShare * 100),
    dividend_trend_pct: dividendTrend !== null ? round2(dividendTrend * 100) : null,
    score: round2(score),
    score_breakdown: {
      yield: round2(yieldScore),
      consistency: round2(consistencyScore),
      dividend_stability: round2(dividendStabilityScore),
      price_stability: round2(priceStabilityScore),
      pvp: round2(pvpScore),
      liquidity: round2(liquidityScore),
      track_record: round2(trackRecordScore),
      amortization_penalty: round2(-amortizationPenalty),
      dividend_trend_penalty: round2(-dividendTrendPenalty),
    },
    flags,
    source,
  }
}

export class GetFiiRankingService {
  constructor(private investmentRepository: InvestmentRepository) {}

  async execute({
    userId,
  }: GetFiiRankingServiceRequest): Promise<GetFiiRankingServiceResponse> {
    const requestedAt = new Date().toISOString()

    let ranking: Omit<FiiRankingEntry, 'owned'>[]
    let universe: GetFiiRankingServiceResponse['universe']

    if (rankingCache && Date.now() - rankingCache.fetchedAt < RANKING_CACHE_TTL_MS) {
      ranking = rankingCache.ranking
      universe = rankingCache.universe
    } else {
      const market = await fetchFiiMarket()
      if (!market) {
        throw new FiiMarketUnavailableError()
      }

      const eligible = market.filter(
        (entry) =>
          entry.dividendYield > 0 &&
          entry.liquidity >= MIN_LIQUIDITY &&
          entry.marketValue >= MIN_MARKET_VALUE &&
          entry.pvp >= PVP_RANGE[0] &&
          entry.pvp <= PVP_RANGE[1]
      )

      // Pré-seleção pelo DY do Fundamentus: barato e suficiente para achar os
      // candidatos; a análise profunda (que custa scraping) fica só no topo.
      const candidates = [...eligible]
        .sort((a, b) => b.dividendYield - a.dividendYield)
        .slice(0, CANDIDATES)

      const { results } = await fetchManyFiiDividends(
        candidates.map((c) => c.ticker)
      )
      const dividendsByTicker = new Map(results.map((r) => [r.ticker, r]))

      const priceChanges = await mapWithConcurrency(
        candidates,
        3,
        async (candidate) => {
          try {
            return await fetchPriceChange12m(candidate.ticker)
          } catch {
            return null
          }
        }
      )

      const scored: ScoredCandidate[] = []
      for (let i = 0; i < candidates.length; i++) {
        const dividendData = dividendsByTicker.get(candidates[i].ticker)
        if (!dividendData) continue

        const candidate = scoreCandidate(
          candidates[i],
          dividendData.dividends,
          dividendData.source,
          priceChanges[i]
        )
        if (candidate) scored.push(candidate)
      }

      scored.sort((a, b) => b.score - a.score)

      ranking = scored.map((entry, index) => ({ ...entry, rank: index + 1 }))
      universe = {
        total: market.length,
        eligible: eligible.length,
        analyzed: ranking.length,
      }

      rankingCache = { fetchedAt: Date.now(), ranking, universe }
    }

    // Flag `owned` é a única parte por usuário: marca os fundos da carteira.
    const investments =
      await this.investmentRepository.findAllPortfolioByUser(userId)
    const ownedTickers = new Set(
      investments
        .filter(
          (inv) => inv.status === 'ACTIVE' && inv.investment_type === 'FII'
        )
        .map((inv) => inv.ticker?.trim().toUpperCase())
        .filter((ticker): ticker is string => Boolean(ticker))
    )

    return {
      ranking: ranking.map((entry) => ({
        ...entry,
        owned: ownedTickers.has(entry.ticker),
      })),
      universe,
      criteria: {
        min_liquidity: MIN_LIQUIDITY,
        pvp_range: PVP_RANGE,
        candidates: CANDIDATES,
      },
      requestedAt,
    }
  }
}
