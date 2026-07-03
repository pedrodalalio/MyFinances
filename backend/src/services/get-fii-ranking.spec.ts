import { describe, expect, it } from 'vitest'
import { scoreCandidate } from './get-fii-ranking'
import { FiiMarketEntry } from '@/lib/fii-market'
import { FiiDividend } from '@/lib/fii-dividends'

// O score existe para separar yield alto de verdade de yield alto de mentira
// (amortização, cota derretendo, pagamento errático). Estes testes travam
// esse comportamento.

function makeEntry(overrides: Partial<FiiMarketEntry> = {}): FiiMarketEntry {
  return {
    ticker: 'TEST11',
    segment: 'Logística',
    price: 10,
    dividendYield: 12,
    pvp: 0.95,
    marketValue: 500_000_000,
    liquidity: 1_000_000,
    vacancy: 0,
    ...overrides,
  }
}

/** Data-com ISO de `n` meses atrás (aprox. 30 dias por mês). */
function monthsAgo(n: number): string {
  return new Date(Date.now() - n * 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
}

/** 12 rendimentos mensais de mesmo valor, do mês passado para trás. */
function steadyDividends(value: number, type = 'Rendimento'): FiiDividend[] {
  return Array.from({ length: 12 }, (_, i) => ({
    exDate: monthsAgo(i + 1),
    paymentDate: monthsAgo(i + 1),
    value,
    type,
  }))
}

describe('scoreCandidate', () => {
  it('pontua alto um fundo que paga todo mês o mesmo valor com preço estável', () => {
    const scored = scoreCandidate(
      makeEntry(),
      steadyDividends(0.1), // 1% a.m. sobre cota de R$ 10
      'statusinvest',
      0 // cota estável em 12m
    )

    expect(scored).not.toBeNull()
    expect(scored!.monthly_yield_pct).toBeCloseTo(1, 1)
    expect(scored!.months_paid_12m).toBe(12)
    expect(scored!.score).toBeGreaterThan(80)
    expect(scored!.flags).toEqual([])
  })

  it('penaliza amortização: mesmo rendimento, mas com devolução de capital junto', () => {
    const clean = scoreCandidate(makeEntry(), steadyDividends(0.1), 'statusinvest', 0)

    const withAmortization = scoreCandidate(
      makeEntry(),
      [...steadyDividends(0.1), ...steadyDividends(0.15, 'Amortização')],
      'statusinvest',
      0
    )

    expect(withAmortization!.score).toBeLessThan(clean!.score)
    expect(withAmortization!.flags).toContain('amortizacao')
    // Amortização não conta como rendimento: o yield não pode ser inflado.
    expect(withAmortization!.monthly_yield_pct).toBeCloseTo(
      clean!.monthly_yield_pct,
      5
    )
  })

  it('penaliza cota derretendo: mesmo provento, preço caindo 25% em 12m', () => {
    const stable = scoreCandidate(makeEntry(), steadyDividends(0.1), 'statusinvest', 0)
    const melting = scoreCandidate(makeEntry(), steadyDividends(0.1), 'statusinvest', -25)

    expect(melting!.score).toBeLessThan(stable!.score)
    expect(melting!.flags).toContain('queda_preco')
    expect(melting!.score_breakdown.price_stability).toBe(0)
  })

  it('não penaliza cota subindo: valorização não é defeito', () => {
    const stable = scoreCandidate(makeEntry(), steadyDividends(0.1), 'statusinvest', 0)
    const rising = scoreCandidate(makeEntry(), steadyDividends(0.1), 'statusinvest', 20)

    expect(rising!.score_breakdown.price_stability).toBe(
      stable!.score_breakdown.price_stability
    )
  })

  it('prefere renda previsível: mesma média, mas valores erráticos pontuam menos', () => {
    const steady = scoreCandidate(makeEntry(), steadyDividends(0.1), 'statusinvest', 0)

    // Média também é 0,10, mas alternando 0,02 e 0,18.
    const erratic = scoreCandidate(
      makeEntry(),
      steadyDividends(0.1).map((d, i) => ({
        ...d,
        value: i % 2 === 0 ? 0.02 : 0.18,
      })),
      'statusinvest',
      0
    )

    expect(erratic!.monthly_yield_pct).toBeCloseTo(steady!.monthly_yield_pct, 5)
    expect(erratic!.score).toBeLessThan(steady!.score)
  })

  it('marca pagamento irregular quando o fundo pulou meses', () => {
    const scored = scoreCandidate(
      makeEntry(),
      steadyDividends(0.1).slice(0, 6), // só 6 meses pagos
      'statusinvest',
      0
    )

    expect(scored!.months_paid_12m).toBe(6)
    expect(scored!.flags).toContain('pagamento_irregular')
  })

  it('fica neutro (sem premiar nem punir) quando não há histórico de preço', () => {
    const scored = scoreCandidate(makeEntry(), steadyDividends(0.1), 'statusinvest', null)

    expect(scored!.price_change_12m_pct).toBeNull()
    expect(scored!.score_breakdown.price_stability).toBe(7.5)
    expect(scored!.flags).toContain('sem_historico_preco')
  })

  it('descarta fundo sem proventos na janela de 12 meses', () => {
    const old: FiiDividend[] = [
      {
        exDate: monthsAgo(20),
        paymentDate: monthsAgo(20),
        value: 0.1,
        type: 'Rendimento',
      },
    ]

    expect(scoreCandidate(makeEntry(), old, 'statusinvest', 0)).toBeNull()
    expect(scoreCandidate(makeEntry(), [], 'statusinvest', 0)).toBeNull()
  })
})
