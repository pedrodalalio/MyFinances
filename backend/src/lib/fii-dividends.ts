// Proventos de FIIs a partir de fontes públicas gratuitas, com fallback:
// StatusInvest (JSON, tem data de pagamento e proventos anunciados) →
// Fundamentus (HTML, tem data de pagamento) → Yahoo Finance (JSON, só data-com).
// Nenhuma é API oficial documentada, então toda resposta é validada com cuidado
// e o resultado fica em cache em memória para não martelar os sites.

export interface FiiDividend {
  /** Data-com (último dia com direito ao provento), ISO yyyy-mm-dd */
  exDate: string
  /** Data em que o dinheiro cai na conta, ISO yyyy-mm-dd (null se não informada) */
  paymentDate: string | null
  /** Valor por cota, em R$ */
  value: number
  /** Tipo do provento (Rendimento, Amortização...) */
  type: string
}

export interface FiiDividendsResult {
  ticker: string
  dividends: FiiDividend[]
  source: 'statusinvest' | 'fundamentus' | 'yahoo'
}

const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6h: proventos mudam ~1x por mês

const cache = new Map<string, { fetchedAt: number; result: FiiDividendsResult }>()

/** Converte "dd/MM/yyyy" em "yyyy-mm-dd"; retorna null se inválida. */
function parseBrDate(value: string | null | undefined): string | null {
  if (!value) return null
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null
  const [, day, month, year] = match
  return `${year}-${month}-${day}`
}

/** Converte "0,10" em 0.10; retorna null se inválido. */
function parseBrNumber(value: string | null | undefined): number | null {
  if (!value) return null
  const parsed = parseFloat(value.trim().replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function sortByExDateDesc(dividends: FiiDividend[]): FiiDividend[] {
  return dividends.sort((a, b) => b.exDate.localeCompare(a.exDate))
}

async function fetchFromStatusInvest(ticker: string): Promise<FiiDividend[] | null> {
  const url = `https://statusinvest.com.br/fii/companytickerprovents?ticker=${encodeURIComponent(ticker)}&chartProventsType=2`

  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  })

  if (!response.ok) return null

  const json = (await response.json()) as {
    assetEarningsModels?: Array<{
      ed?: string
      pd?: string
      etd?: string
      v?: number
    }>
  }

  if (!Array.isArray(json.assetEarningsModels)) return null

  const dividends: FiiDividend[] = []

  for (const model of json.assetEarningsModels) {
    const exDate = parseBrDate(model.ed)
    if (!exDate || typeof model.v !== 'number' || model.v <= 0) continue

    dividends.push({
      exDate,
      paymentDate: parseBrDate(model.pd),
      value: model.v,
      type: model.etd || 'Rendimento',
    })
  }

  return dividends.length > 0 ? sortByExDateDesc(dividends) : null
}

async function fetchFromFundamentus(ticker: string): Promise<FiiDividend[] | null> {
  const url = `https://www.fundamentus.com.br/fii_proventos.php?papel=${encodeURIComponent(ticker)}&tipo=2`

  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  })

  if (!response.ok) return null

  const html = await response.text()

  // Linhas da tabela: Data-com | Tipo | Data de Pagamento | Valor
  const cells = Array.from(html.matchAll(/<td[^>]*>([^<]*)<\/td>/g)).map((m) =>
    m[1].trim()
  )

  const dividends: FiiDividend[] = []

  for (let i = 0; i + 3 < cells.length; i += 4) {
    const exDate = parseBrDate(cells[i])
    const value = parseBrNumber(cells[i + 3])
    if (!exDate || value === null || value <= 0) continue

    dividends.push({
      exDate,
      paymentDate: parseBrDate(cells[i + 2]),
      value,
      type: cells[i + 1] || 'Rendimento',
    })
  }

  return dividends.length > 0 ? sortByExDateDesc(dividends) : null
}

async function fetchFromYahoo(ticker: string): Promise<FiiDividend[] | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}.SA?range=2y&interval=1d&events=div`

  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  })

  if (!response.ok) return null

  const json = (await response.json()) as {
    chart?: {
      result?: Array<{
        events?: {
          dividends?: Record<string, { amount?: number; date?: number }>
        }
      }>
    }
  }

  const events = json.chart?.result?.[0]?.events?.dividends
  if (!events) return null

  const dividends: FiiDividend[] = []

  for (const event of Object.values(events)) {
    if (
      typeof event.amount !== 'number' ||
      event.amount <= 0 ||
      typeof event.date !== 'number'
    )
      continue

    dividends.push({
      exDate: new Date(event.date * 1000).toISOString().slice(0, 10),
      paymentDate: null,
      value: event.amount,
      type: 'Rendimento',
    })
  }

  return dividends.length > 0 ? sortByExDateDesc(dividends) : null
}

/**
 * Preço atual da cota via Yahoo Finance — fallback para quando a BRAPI
 * não estiver configurada ou não conhecer o ticker.
 */
export async function fetchYahooPrice(ticker: string): Promise<number | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}.SA?range=5d&interval=1d`

  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  })

  if (!response.ok) return null

  const json = (await response.json()) as {
    chart?: {
      result?: Array<{ meta?: { regularMarketPrice?: number } }>
    }
  }

  const price = json.chart?.result?.[0]?.meta?.regularMarketPrice
  return typeof price === 'number' && price > 0 ? price : null
}

/**
 * Busca os proventos de um FII tentando as fontes em ordem de qualidade.
 * Retorna null quando nenhuma fonte respondeu com dados.
 */
export async function fetchFiiDividends(
  ticker: string
): Promise<FiiDividendsResult | null> {
  const normalized = ticker.trim().toUpperCase()

  const cached = cache.get(normalized)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.result
  }

  const sources = [
    { name: 'statusinvest' as const, fetch: fetchFromStatusInvest },
    { name: 'fundamentus' as const, fetch: fetchFromFundamentus },
    { name: 'yahoo' as const, fetch: fetchFromYahoo },
  ]

  for (const source of sources) {
    try {
      const dividends = await source.fetch(normalized)
      if (dividends) {
        const result: FiiDividendsResult = {
          ticker: normalized,
          dividends,
          source: source.name,
        }
        cache.set(normalized, { fetchedAt: Date.now(), result })
        return result
      }
    } catch {
      // fonte fora do ar ou resposta em formato inesperado: tenta a próxima
    }
  }

  return null
}

/**
 * Busca proventos para vários tickers com concorrência limitada,
 * para não parecer rajada de scraping.
 */
export async function fetchManyFiiDividends(
  tickers: string[],
  concurrency = 3
): Promise<{ results: FiiDividendsResult[]; notFound: string[] }> {
  const results: FiiDividendsResult[] = []
  const notFound: string[] = []

  const queue = [...tickers]

  async function worker() {
    while (queue.length > 0) {
      const ticker = queue.shift()
      if (!ticker) break
      const result = await fetchFiiDividends(ticker)
      if (result) {
        results.push(result)
      } else {
        notFound.push(ticker)
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, tickers.length) },
    () => worker()
  )

  await Promise.all(workers)

  return { results, notFound }
}
