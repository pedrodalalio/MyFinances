import { env } from '@/env'

const BRAPI_BASE = 'https://brapi.dev/api'

export interface BrapiQuote {
  ticker: string
  price: number
  currency: string | null
  shortName: string | null
  longName: string | null
}

export class BrapiTokenMissingError extends Error {
  constructor() {
    super('BRAPI_TOKEN não configurado no backend')
    this.name = 'BrapiTokenMissingError'
  }
}

/**
 * Busca a cotação de um único ticker na BRAPI.
 * O plano gratuito permite apenas 1 ativo por requisição, por isso não
 * agrupamos tickers numa só chamada.
 * Retorna null quando o ticker não é encontrado ou a resposta é inesperada.
 */
export async function fetchQuote(ticker: string): Promise<BrapiQuote | null> {
  if (!env.BRAPI_TOKEN) {
    throw new BrapiTokenMissingError()
  }

  const url = `${BRAPI_BASE}/quote/${encodeURIComponent(ticker)}?token=${env.BRAPI_TOKEN}`

  const response = await fetch(url)

  if (!response.ok) {
    return null
  }

  const json = (await response.json()) as {
    results?: Array<{
      symbol?: string
      shortName?: string
      longName?: string
      currency?: string
      regularMarketPrice?: number
    }>
  }

  const result = json.results?.[0]

  if (!result || typeof result.regularMarketPrice !== 'number') {
    return null
  }

  return {
    ticker: result.symbol ?? ticker,
    price: result.regularMarketPrice,
    currency: result.currency ?? null,
    shortName: result.shortName ?? null,
    longName: result.longName ?? null,
  }
}

/**
 * Busca cotações para uma lista de tickers, com concorrência limitada
 * (1 ativo por requisição no plano gratuito da BRAPI).
 */
export async function fetchQuotes(
  tickers: string[],
  concurrency = 4
): Promise<{ quotes: BrapiQuote[]; notFound: string[] }> {
  const quotes: BrapiQuote[] = []
  const notFound: string[] = []

  const queue = [...tickers]

  async function worker() {
    while (queue.length > 0) {
      const ticker = queue.shift()
      if (!ticker) break
      try {
        const quote = await fetchQuote(ticker)
        if (quote) {
          quotes.push(quote)
        } else {
          notFound.push(ticker)
        }
      } catch (error) {
        if (error instanceof BrapiTokenMissingError) {
          throw error
        }
        notFound.push(ticker)
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, tickers.length) },
    () => worker()
  )

  await Promise.all(workers)

  return { quotes, notFound }
}
