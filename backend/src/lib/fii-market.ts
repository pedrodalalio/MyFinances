// Visão do mercado inteiro de FIIs a partir do Fundamentus (fii_resultado.php),
// que lista todos os fundos da bolsa numa única página HTML com os indicadores
// fundamentalistas (segmento, cotação, DY, P/VP, liquidez, vacância).
// Não é API oficial: o HTML vem em ISO-8859-1 e o parsing é validado com
// cuidado; o resultado fica em cache em memória para não martelar o site.

export interface FiiMarketEntry {
  ticker: string
  segment: string
  /** Cotação atual, em R$ */
  price: number
  /** Dividend yield 12m, em % (ex: 9.49) */
  dividendYield: number
  /** Preço / valor patrimonial da cota */
  pvp: number
  /** Valor de mercado do fundo, em R$ */
  marketValue: number
  /** Volume médio negociado por dia, em R$ */
  liquidity: number
  /** Vacância média, em % (0 para fundos de papel) */
  vacancy: number
}

const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6h: indicadores mudam devagar

let marketCache: { fetchedAt: number; entries: FiiMarketEntry[] } | null = null

/** Converte "165.857.000" / "9,49%" / "0,66" em número; null se inválido. */
function parseBrNumber(value: string | null | undefined): number | null {
  if (!value) return null
  const cleaned = value.trim().replace(/%$/, '').replace(/\./g, '').replace(',', '.')
  const parsed = parseFloat(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

/** Remove tags e espaços extras de uma célula da tabela. */
function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

/**
 * Lista todos os FIIs da bolsa com seus indicadores fundamentalistas.
 * Retorna null quando o Fundamentus está fora do ar ou mudou o layout.
 */
export async function fetchFiiMarket(): Promise<FiiMarketEntry[] | null> {
  if (marketCache && Date.now() - marketCache.fetchedAt < CACHE_TTL_MS) {
    return marketCache.entries
  }

  const response = await fetch('https://www.fundamentus.com.br/fii_resultado.php', {
    headers: { 'User-Agent': USER_AGENT },
  })

  if (!response.ok) return null

  // A página declara charset ISO-8859-1; decodificar como UTF-8 quebraria
  // os segmentos acentuados ("Logística", "Híbrido").
  const html = new TextDecoder('iso-8859-1')
    .decode(await response.arrayBuffer())
    .replace(/[\n\r\t]/g, ' ')

  const entries: FiiMarketEntry[] = []

  // Colunas: Papel | Segmento | Cotação | FFO Yield | Dividend Yield | P/VP |
  // Valor de Mercado | Liquidez | Qtd imóveis | Preço m² | Aluguel m² |
  // Cap Rate | Vacância | endereço (oculta)
  for (const row of html.matchAll(/<tr[^>]*>(.*?)<\/tr>/g)) {
    const tickerMatch = row[1].match(/papel=([A-Z0-9]+)/)
    if (!tickerMatch) continue

    const cells = Array.from(row[1].matchAll(/<td[^>]*>(.*?)<\/td>/g)).map((m) =>
      stripTags(m[1])
    )
    if (cells.length < 13) continue

    const price = parseBrNumber(cells[2])
    const dividendYield = parseBrNumber(cells[4])
    const pvp = parseBrNumber(cells[5])
    const marketValue = parseBrNumber(cells[6])
    const liquidity = parseBrNumber(cells[7])
    const vacancy = parseBrNumber(cells[12])

    if (price === null || price <= 0 || dividendYield === null || pvp === null)
      continue

    entries.push({
      ticker: tickerMatch[1],
      segment: cells[1] || 'Outros',
      price,
      dividendYield,
      pvp,
      marketValue: marketValue ?? 0,
      liquidity: liquidity ?? 0,
      vacancy: vacancy ?? 0,
    })
  }

  if (entries.length === 0) return null

  marketCache = { fetchedAt: Date.now(), entries }
  return entries
}

// Distingue "a fonte respondeu" de "a fonte falhou": um fundo recém-listado
// responde com histórico curto (change: null, definitivo — não adianta tentar
// de novo), enquanto erro de rede/throttle retorna null (vale retry).
type PriceChangeAnswer = { change: number | null } | null

async function fetchPriceChange12mFromStatusInvest(
  ticker: string
): Promise<PriceChangeAnswer> {
  const url = `https://statusinvest.com.br/fii/tickerprice?ticker=${encodeURIComponent(ticker)}&type=3&currences%5B%5D=1`

  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  })

  if (!response.ok) return null

  const json = (await response.json()) as Array<{
    prices?: Array<{ price?: number }>
  }>
  if (!Array.isArray(json) || !Array.isArray(json[0]?.prices)) return null

  // type=3 = fechamentos diários do último ano, do mais antigo ao mais novo.
  const prices = (json[0].prices ?? [])
    .map((p) => p.price)
    .filter((p): p is number => typeof p === 'number' && p > 0)

  // ~252 pregões por ano; bem menos que isso é fundo recém-listado, e a
  // "variação 12m" seria mentira.
  if (prices.length < 200) return { change: null }

  const oldest = prices[0]
  const current = prices[prices.length - 1]
  return { change: ((current - oldest) / oldest) * 100 }
}

async function fetchPriceChange12mFromYahoo(
  ticker: string
): Promise<number | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}.SA?range=1y&interval=1mo`

  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  })

  if (!response.ok) return null

  const json = (await response.json()) as {
    chart?: {
      result?: Array<{
        meta?: { regularMarketPrice?: number }
        indicators?: { quote?: Array<{ close?: Array<number | null> }> }
      }>
    }
  }

  const result = json.chart?.result?.[0]
  const closes = (result?.indicators?.quote?.[0]?.close ?? []).filter(
    (c): c is number => typeof c === 'number' && c > 0
  )
  const current = result?.meta?.regularMarketPrice ?? closes[closes.length - 1]

  // Mesma exigência de ~1 ano de histórico, aqui em fechamentos mensais.
  if (closes.length < 10 || typeof current !== 'number' || current <= 0)
    return null

  const oldest = closes[0]
  return ((current - oldest) / oldest) * 100
}

const priceChangeCache = new Map<string, { fetchedAt: number; change: number | null }>()

/**
 * Variação da cota nos últimos 12 meses, em %. StatusInvest primeiro (mesma
 * fonte dos proventos), com um retry espaçado — o ranking dispara ~60
 * requests em rajada e o site recusa algumas — e Yahoo como fallback.
 * Retorna null quando nenhuma fonte respondeu ou o fundo é recente demais
 * para ter 12 meses de histórico (esse null é definitivo e fica em cache).
 */
export async function fetchPriceChange12m(ticker: string): Promise<number | null> {
  const cached = priceChangeCache.get(ticker)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.change
  }

  const remember = (change: number | null) => {
    priceChangeCache.set(ticker, { fetchedAt: Date.now(), change })
    return change
  }

  // Backoff crescente: na rajada do ranking o StatusInvest recusa parte das
  // requests, mas aceita as mesmas segundos depois.
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0)
      await new Promise((resolve) => setTimeout(resolve, attempt * 1500))
    try {
      const answer = await fetchPriceChange12mFromStatusInvest(ticker)
      if (answer) return remember(answer.change)
    } catch {
      // fora do ar ou formato inesperado: retry e depois a próxima fonte
    }
  }

  try {
    const change = await fetchPriceChange12mFromYahoo(ticker)
    // Falha (null) não vai para o cache: a próxima montagem tenta de novo.
    return change !== null ? remember(change) : null
  } catch {
    return null
  }
}
