import { fetchFiiDividends, fetchYahooPrice } from '@/lib/fii-dividends'
import { fetchQuote } from '@/lib/brapi'

interface LookupFiiServiceRequest {
  ticker: string
}

interface LookupFiiServiceResponse {
  ticker: string
  /** Preço atual da cota (null se nenhuma fonte de cotação respondeu) */
  price: number | null
  /** Distribuição média mensal por cota nos últimos 12 meses */
  avg_per_share_12m: number
  /** Fonte dos proventos */
  source: string
  requestedAt: string
}

export class FiiNotFoundError extends Error {
  constructor(ticker: string) {
    super(`Não encontrei proventos para ${ticker}`)
    this.name = 'FiiNotFoundError'
  }
}

/**
 * Dados de um FII qualquer (dentro ou fora da carteira) para o simulador:
 * preço da cota + média de distribuição 12m.
 */
export class LookupFiiService {
  async execute({
    ticker,
  }: LookupFiiServiceRequest): Promise<LookupFiiServiceResponse> {
    const normalized = ticker.trim().toUpperCase()

    const result = await fetchFiiDividends(normalized)
    if (!result) {
      throw new FiiNotFoundError(normalized)
    }

    const today = new Date().toISOString().slice(0, 10)
    const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)

    const window = result.dividends.filter(
      (d) =>
        d.exDate >= yearAgo &&
        (d.paymentDate ? d.paymentDate <= today : d.exDate <= today)
    )
    const monthsWithData = new Set(window.map((d) => d.exDate.slice(0, 7)))
      .size
    const avgPerShare =
      monthsWithData > 0
        ? window.reduce((sum, d) => sum + d.value, 0) / monthsWithData
        : 0

    let price: number | null = null
    try {
      const quote = await fetchQuote(normalized)
      price = quote?.price ?? null
    } catch {
      // sem token BRAPI ou fora do ar: tenta o Yahoo
    }
    if (price === null) {
      try {
        price = await fetchYahooPrice(normalized)
      } catch {
        price = null
      }
    }

    return {
      ticker: normalized,
      price,
      avg_per_share_12m: avgPerShare,
      source: result.source,
      requestedAt: new Date().toISOString(),
    }
  }
}
