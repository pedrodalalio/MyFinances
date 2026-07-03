// Série histórica do CDI diário (% a.d.) via API pública do SGS do Banco
// Central (série 12) — sem token. O resultado é transformado em fator
// acumulado por dia útil e fica em cache em memória, já que a série só
// ganha um ponto novo por dia.

export class CdiUnavailableError extends Error {
  constructor() {
    super('Não foi possível obter a série do CDI no Banco Central. Tente novamente mais tarde.')
  }
}

export interface CdiCumulativePoint {
  /** Dia útil, ISO yyyy-mm-dd */
  date: string
  /** Produto acumulado de (1 + cdi_diário) até este dia, inclusive */
  cum: number
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000

let cache: {
  startIso: string
  fetchedAt: number
  points: CdiCumulativePoint[]
} | null = null

/** "yyyy-mm-dd" → "dd/MM/yyyy" (formato exigido pela API do SGS) */
function isoToBr(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

/** "dd/MM/yyyy" → "yyyy-mm-dd" */
function brToIso(br: string): string | null {
  const match = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null
  const [, day, month, year] = match
  return `${year}-${month}-${day}`
}

function todayIso(): string {
  return new Date().toISOString().split('T')[0]
}

/** Soma dias a uma data ISO sem depender de timezone local */
function addDaysIso(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().split('T')[0]
}

interface SgsEntry {
  data?: string
  valor?: string
}

async function fetchSgsRange(startIso: string, endIso: string): Promise<Array<{ date: string; rate: number }>> {
  const url =
    `https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json` +
    `&dataInicial=${encodeURIComponent(isoToBr(startIso))}` +
    `&dataFinal=${encodeURIComponent(isoToBr(endIso))}`

  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new CdiUnavailableError()

  const json = (await response.json()) as SgsEntry[]
  if (!Array.isArray(json)) throw new CdiUnavailableError()

  const entries: Array<{ date: string; rate: number }> = []
  for (const entry of json) {
    const date = brToIso(entry.data ?? '')
    const rate = parseFloat(entry.valor ?? '')
    if (!date || !Number.isFinite(rate)) continue
    entries.push({ date, rate })
  }
  return entries
}

/**
 * Retorna a série de fatores acumulados do CDI de `startIso` até hoje.
 * A API do SGS limita séries diárias a 10 anos por request, então o
 * período é buscado em janelas.
 */
export async function getCdiCumulativeSeries(startIso: string): Promise<CdiCumulativePoint[]> {
  // Serve do cache se ele cobre o período pedido. Os pontos anteriores a
  // startIso não atrapalham: todo consumo é por razão entre fatores.
  const now = Date.now()
  if (cache && cache.startIso <= startIso && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.points
  }

  const end = todayIso()
  const entries: Array<{ date: string; rate: number }> = []

  let windowStart = startIso
  while (windowStart <= end) {
    // Janela de ~9 anos, abaixo do limite de 10 anos do SGS
    const windowEnd = addDaysIso(windowStart, 9 * 365)
    const rangeEnd = windowEnd < end ? windowEnd : end
    entries.push(...(await fetchSgsRange(windowStart, rangeEnd)))
    windowStart = addDaysIso(rangeEnd, 1)
  }

  if (entries.length === 0) throw new CdiUnavailableError()

  entries.sort((a, b) => a.date.localeCompare(b.date))

  let cum = 1
  const points: CdiCumulativePoint[] = entries.map((entry) => {
    cum *= 1 + entry.rate / 100
    return { date: entry.date, cum }
  })

  cache = { startIso, fetchedAt: now, points }
  return points
}

/** Fator acumulado no último dia útil ≤ `iso` (1 antes do primeiro ponto). */
export function cdiCumAt(points: CdiCumulativePoint[], iso: string): number {
  let low = 0
  let high = points.length - 1
  let result = 1
  while (low <= high) {
    const mid = (low + high) >> 1
    if (points[mid].date <= iso) {
      result = points[mid].cum
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  return result
}

/**
 * Fator do CDI entre a data de aplicação (`fromIso`, exclusive o acumulado
 * anterior — o dia da aplicação já rende) e `toIso`, inclusive.
 */
export function cdiFactorBetween(points: CdiCumulativePoint[], fromIso: string, toIso: string): number {
  if (toIso < fromIso) return 1
  const base = cdiCumAt(points, addDaysIso(fromIso, -1))
  return cdiCumAt(points, toIso) / base
}
