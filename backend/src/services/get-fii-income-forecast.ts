import { InvestmentRepository } from '@/repositories/investment-repository'
import { fetchManyFiiDividends, FiiDividend } from '@/lib/fii-dividends'

interface GetFiiIncomeForecastServiceRequest {
  userId: string
}

export interface FiiPayment {
  ex_date: string
  payment_date: string | null
  value_per_share: number
  total: number
  type: string
}

export interface FiiFundForecast {
  ticker: string
  quantity: number
  invested: number
  source: string
  /** Data da primeira compra do fundo (ISO yyyy-mm-dd) */
  first_purchase_date: string | null
  /** Último provento já pago */
  last_payment: FiiPayment | null
  /** Provento anunciado ainda não pago (valor certo, não previsão) */
  next_payment: FiiPayment | null
  /** Média mensal por cota nos últimos 12 meses */
  avg_per_share_12m: number
  /** Previsão de renda mensal (média 12m × cotas) */
  monthly_forecast: number
  annual_forecast: number
  /** Quanto o usuário recebeu de fato nos últimos 12 meses (respeita a data de compra de cada lote) */
  received_12m: number
  /** Quanto o usuário recebeu de fato desde a compra, acumulado */
  received_total: number
  /** received_12m / valor investido, em % (retorno já realizado) */
  yield_on_cost_12m: number | null
  /** annual_forecast / valor investido, em % (rendimento anual no ritmo atual) */
  projected_yield: number | null
  /** Próxima data-com: até quando comprar para ter direito ao próximo provento */
  next_ex_date: string | null
  /** true = estimada pelo padrão histórico; false = já anunciada pelo fundo */
  next_ex_date_is_estimate: boolean
  /** Dia do mês em que a data-com costuma cair (mediana das últimas 12) */
  typical_ex_day: number | null
  /** Proventos mês a mês (mês em que o dinheiro caiu), do mais antigo ao mais novo */
  history_12m: Array<{ month: string; value_per_share: number; total: number }>
}

interface GetFiiIncomeForecastServiceResponse {
  funds: FiiFundForecast[]
  summary: {
    monthly_forecast: number
    annual_forecast: number
    invested: number
    received_12m: number
    received_total: number
    yield_on_cost_12m: number | null
    projected_yield: number | null
    /** Próximos pagamentos anunciados, ordenados por data */
    next_payments: Array<FiiPayment & { ticker: string }>
    next_payments_total: number
  }
  notFound: string[]
  requestedAt: string
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Próxima ocorrência (>= hoje) de um dia do mês, clampando o dia em meses
 * mais curtos (dia 31 vira 30/28 quando o mês não tem).
 */
function nextOccurrenceOfDay(todayIso: string, day: number): string {
  let year = parseInt(todayIso.slice(0, 4))
  let month = parseInt(todayIso.slice(5, 7))

  for (let i = 0; i < 2; i++) {
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
    const clamped = Math.min(day, lastDay)
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(clamped).padStart(2, '0')}`
    if (iso >= todayIso) return iso
    month++
    if (month > 12) {
      month = 1
      year++
    }
  }

  return todayIso
}

export class GetFiiIncomeForecastService {
  constructor(private investmentRepository: InvestmentRepository) {}

  async execute({
    userId,
  }: GetFiiIncomeForecastServiceRequest): Promise<GetFiiIncomeForecastServiceResponse> {
    const investments =
      await this.investmentRepository.findAllPortfolioByUser(userId)

    // Agrupa por ticker preservando os lotes: cada compra tem sua data, e um
    // provento só conta para o usuário se a data-com for depois da compra.
    interface Lot {
      quantity: number
      invested: number
      purchaseDate: string // ISO yyyy-mm-dd
    }

    const byTicker = new Map<
      string,
      { quantity: number; invested: number; lots: Lot[] }
    >()

    for (const investment of investments) {
      if (investment.status !== 'ACTIVE') continue
      if (investment.investment_type !== 'FII') continue
      const ticker = investment.ticker?.trim().toUpperCase()
      if (!ticker) continue

      const quantity = investment.quantity ? Number(investment.quantity) : 1
      const invested = Number(investment.amount) * quantity
      const purchaseDate = (investment.purchase_date ?? investment.date)
        .toISOString()
        .slice(0, 10)

      const entry =
        byTicker.get(ticker) ?? { quantity: 0, invested: 0, lots: [] }
      entry.quantity += quantity
      entry.invested += invested
      entry.lots.push({ quantity, invested, purchaseDate })
      byTicker.set(ticker, entry)
    }

    const tickers = Array.from(byTicker.keys())
    const requestedAt = new Date().toISOString()

    if (tickers.length === 0) {
      return {
        funds: [],
        summary: {
          monthly_forecast: 0,
          annual_forecast: 0,
          invested: 0,
          received_12m: 0,
          received_total: 0,
          yield_on_cost_12m: null,
          projected_yield: null,
          next_payments: [],
          next_payments_total: 0,
        },
        notFound: [],
        requestedAt,
      }
    }

    const { results, notFound } = await fetchManyFiiDividends(tickers)

    const today = new Date().toISOString().slice(0, 10)
    const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)

    const funds: FiiFundForecast[] = []

    for (const result of results) {
      const position = byTicker.get(result.ticker)
      if (!position) continue

      const toPayment = (dividend: FiiDividend): FiiPayment => ({
        ex_date: dividend.exDate,
        payment_date: dividend.paymentDate,
        value_per_share: dividend.value,
        total: round2(dividend.value * position.quantity),
        type: dividend.type,
      })

      // Já pago = data de pagamento no passado; sem data de pagamento,
      // usa a data-com como aproximação (caso Yahoo).
      const isPaid = (d: FiiDividend) =>
        d.paymentDate ? d.paymentDate <= today : d.exDate <= today

      const paid = result.dividends.filter(isPaid)
      const upcoming = result.dividends
        .filter((d) => !isPaid(d))
        .sort((a, b) =>
          (a.paymentDate ?? a.exDate).localeCompare(b.paymentDate ?? b.exDate)
        )

      const lastPayment = paid[0] ? toPayment(paid[0]) : null
      const nextPayment = upcoming[0] ? toPayment(upcoming[0]) : null

      // Cotas que o usuário já possuía na data-com: só esses proventos
      // renderam de fato para ele.
      const ownedQuantityAt = (exDate: string) =>
        position.lots.reduce(
          (sum, lot) => (lot.purchaseDate <= exDate ? sum + lot.quantity : sum),
          0
        )

      const firstPurchaseDate =
        position.lots.map((lot) => lot.purchaseDate).sort()[0] ?? null

      // Total acumulado desde a compra (limitado ao histórico da fonte,
      // que cobre anos — mais do que suficiente para carteiras normais).
      const receivedTotal = round2(
        paid.reduce(
          (sum, d) => sum + d.value * ownedQuantityAt(d.exDate),
          0
        )
      )

      // Janela de 12 meses pela data-com (a data que define o direito),
      // considerando só o que já foi distribuído.
      const window = paid.filter((d) => d.exDate >= yearAgo)
      const sumPerShare12m = window.reduce((sum, d) => sum + d.value, 0)

      // Média por meses com distribuição (FII paga mensalmente; um fundo
      // recém-listado não deve ter a média diluída por meses sem histórico).
      const monthsWithData = new Set(window.map((d) => d.exDate.slice(0, 7)))
        .size
      const avgPerShare =
        monthsWithData > 0 ? sumPerShare12m / monthsWithData : 0

      const received12m = round2(
        window.reduce(
          (sum, d) => sum + d.value * ownedQuantityAt(d.exDate),
          0
        )
      )
      const monthlyForecast = round2(avgPerShare * position.quantity)
      const annualForecast = round2(avgPerShare * position.quantity * 12)

      // Próxima data-com: se o fundo já anunciou uma futura, é certeza;
      // senão, estima pela mediana do dia do mês das últimas 12 datas-com
      // (fundos são bem regulares: sempre ~dia 18, ou último dia do mês...).
      const announcedFutureEx =
        result.dividends
          .filter((d) => d.exDate > today)
          .sort((a, b) => a.exDate.localeCompare(b.exDate))[0] ?? null

      const exDays = paid
        .slice(0, 12)
        .map((d) => parseInt(d.exDate.slice(8, 10)))
        .sort((a, b) => a - b)
      const typicalExDay =
        exDays.length > 0 ? exDays[Math.floor(exDays.length / 2)] : null

      const nextExDate =
        announcedFutureEx?.exDate ??
        (typicalExDay !== null
          ? nextOccurrenceOfDay(today, typicalExDay)
          : null)

      // Histórico mês a mês pelo mês em que o dinheiro caiu na conta,
      // com o total refletindo as cotas possuídas em cada data-com.
      const byMonth = new Map<
        string,
        { valuePerShare: number; total: number }
      >()
      for (const dividend of window) {
        const owned = ownedQuantityAt(dividend.exDate)
        if (owned === 0) continue
        const month = (dividend.paymentDate ?? dividend.exDate).slice(0, 7)
        const entry = byMonth.get(month) ?? { valuePerShare: 0, total: 0 }
        entry.valuePerShare += dividend.value
        entry.total += dividend.value * owned
        byMonth.set(month, entry)
      }
      const history = Array.from(byMonth.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .map(([month, entry]) => ({
          month,
          value_per_share: entry.valuePerShare,
          total: round2(entry.total),
        }))

      funds.push({
        ticker: result.ticker,
        quantity: position.quantity,
        invested: round2(position.invested),
        source: result.source,
        first_purchase_date: firstPurchaseDate,
        last_payment: lastPayment,
        next_payment: nextPayment,
        avg_per_share_12m: avgPerShare,
        monthly_forecast: monthlyForecast,
        annual_forecast: annualForecast,
        received_12m: received12m,
        received_total: receivedTotal,
        yield_on_cost_12m:
          position.invested > 0
            ? round2((received12m / position.invested) * 100)
            : null,
        projected_yield:
          position.invested > 0
            ? round2((annualForecast / position.invested) * 100)
            : null,
        next_ex_date: nextExDate,
        next_ex_date_is_estimate: !announcedFutureEx,
        typical_ex_day: typicalExDay,
        history_12m: history,
      })
    }

    funds.sort((a, b) => b.monthly_forecast - a.monthly_forecast)

    const investedTotal = round2(
      funds.reduce((sum, fund) => sum + fund.invested, 0)
    )
    const received12mTotal = round2(
      funds.reduce((sum, fund) => sum + fund.received_12m, 0)
    )
    const receivedTotalSum = round2(
      funds.reduce((sum, fund) => sum + fund.received_total, 0)
    )
    const monthlyForecastTotal = round2(
      funds.reduce((sum, fund) => sum + fund.monthly_forecast, 0)
    )

    const nextPayments = funds
      .filter((fund) => fund.next_payment)
      .map((fund) => ({ ...fund.next_payment!, ticker: fund.ticker }))
      .sort((a, b) =>
        (a.payment_date ?? a.ex_date).localeCompare(b.payment_date ?? b.ex_date)
      )

    return {
      funds,
      summary: {
        monthly_forecast: monthlyForecastTotal,
        annual_forecast: round2(monthlyForecastTotal * 12),
        invested: investedTotal,
        received_12m: received12mTotal,
        received_total: receivedTotalSum,
        yield_on_cost_12m:
          investedTotal > 0
            ? round2((received12mTotal / investedTotal) * 100)
            : null,
        projected_yield:
          investedTotal > 0
            ? round2(((monthlyForecastTotal * 12) / investedTotal) * 100)
            : null,
        next_payments: nextPayments,
        next_payments_total: round2(
          nextPayments.reduce((sum, payment) => sum + payment.total, 0)
        ),
      },
      notFound,
      requestedAt,
    }
  }
}
