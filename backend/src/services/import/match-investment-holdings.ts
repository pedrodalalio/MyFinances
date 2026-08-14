import type { ParsedInvestmentHolding } from "./parse-investment-statement"

// Casa cada título do extrato de renda fixa com um investimento do app.
//
// A chave óbvia — data de aplicação + valor aplicado — só funciona enquanto o
// título nunca sofreu resgate parcial. O PagBank NUNCA reduz o "V. Aplicado"
// depois de um saque: o extrato continua dizendo 555,50 mesmo depois de você
// tirar 200. O app, ao contrário, reduz o `amount` proporcionalmente. A partir
// do primeiro saque parcial os dois números divergem para sempre, e o título
// ficava órfão em toda importação seguinte.
//
// Data de aplicação e data de vencimento, essas sim, não mudam nunca. Então o
// casamento roda em duas passadas: primeiro o par exato (rápido e sem
// ambiguidade), depois as datas para o que sobrou.

// Índice do dia (dias desde a época, UTC) para comparar datas ignorando hora.
function dayIndex(d: Date): number {
  return Math.floor(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86_400_000,
  )
}

export interface HoldingCandidate {
  id: string
  purchase_date: Date | null
  maturity_date?: Date | null
  amount: unknown
  gross_yield?: unknown
  net_value?: unknown
}

export interface MatchedHolding<C> {
  investment: C
  holding: ParsedInvestmentHolding
}

export interface HoldingMatchResult<C> {
  matched: MatchedHolding<C>[]
  unmatched: ParsedInvestmentHolding[]
}

// Valor de mercado conhecido pelo app, para desempatar contra o V. Bruto do
// extrato. Sem acompanhamento de rendimento, sobra o aplicado.
function currentValue(inv: HoldingCandidate): number {
  const gross = Number(inv.gross_yield ?? NaN)
  if (Number.isFinite(gross) && gross > 0) return gross
  const net = Number(inv.net_value ?? NaN)
  if (Number.isFinite(net) && net > 0) return net
  return Number(inv.amount)
}

// A planilha (.xlsx/.csv) não traz vencimento — o parser repete a data de
// aplicação nesse campo. Só dá para usar como filtro quando é data de verdade.
function holdingMaturityDay(h: ParsedInvestmentHolding): number | null {
  const maturity = dayIndex(h.maturityDate)
  return maturity === dayIndex(h.purchaseDate) ? null : maturity
}

export function matchInvestmentHoldings<C extends HoldingCandidate>(
  holdings: ParsedInvestmentHolding[],
  candidates: C[],
): HoldingMatchResult<C> {
  const usable = candidates.filter((inv) => inv.purchase_date != null)
  const consumed = new Set<string>()
  const matched: MatchedHolding<C>[] = []

  const sameDay = (inv: C, h: ParsedInvestmentHolding) =>
    Math.abs(dayIndex(inv.purchase_date as Date) - dayIndex(h.purchaseDate)) <= 1

  // 1ª passada: data de aplicação (±1 dia) + valor aplicado. Reserva os pares
  // inequívocos antes que a passada seguinte, mais frouxa, possa roubá-los.
  const pending: ParsedInvestmentHolding[] = []

  for (const h of holdings) {
    if (h.applied == null) {
      pending.push(h)
      continue
    }
    const applied = h.applied
    const tolerance = Math.max(0.5, applied * 0.001)

    let best: { inv: C; score: number } | null = null
    for (const inv of usable) {
      if (consumed.has(inv.id) || !sameDay(inv, h)) continue
      const amountDiff = Math.abs(Number(inv.amount) - applied)
      if (amountDiff > tolerance) continue
      const dayDiff = Math.abs(dayIndex(inv.purchase_date as Date) - dayIndex(h.purchaseDate))
      const score = dayDiff * 1000 + amountDiff
      if (!best || score < best.score) best = { inv, score }
    }

    if (best) {
      consumed.add(best.inv.id)
      matched.push({ investment: best.inv, holding: h })
    } else {
      pending.push(h)
    }
  }

  // 2ª passada: só as datas. É aqui que os títulos com resgate parcial voltam a
  // casar, já que o aplicado dos dois lados nunca mais vai bater.
  const unmatched: ParsedInvestmentHolding[] = []

  for (const h of pending) {
    const maturity = holdingMaturityDay(h)

    const pool = usable.filter((inv) => {
      if (consumed.has(inv.id) || !sameDay(inv, h)) return false
      // Vencimento só entra como filtro quando os dois lados o conhecem.
      if (maturity === null || inv.maturity_date == null) return true
      return Math.abs(dayIndex(inv.maturity_date) - maturity) <= 1
    })

    if (pool.length === 0) {
      unmatched.push(h)
      continue
    }

    // Mais de um título na mesma data e vencimento: fica com o de valor atual
    // mais próximo do V. Bruto do extrato. O aplicado não serve de desempate
    // justamente porque é ele que está defasado.
    const winner = pool.reduce((a, b) =>
      Math.abs(currentValue(a) - h.gross) <= Math.abs(currentValue(b) - h.gross) ? a : b,
    )
    consumed.add(winner.id)
    matched.push({ investment: winner, holding: h })
  }

  return { matched, unmatched }
}
