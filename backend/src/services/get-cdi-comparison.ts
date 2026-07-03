import { prisma } from '@/lib/prisma'
import { cdiFactorBetween, getCdiCumulativeSeries } from '@/lib/bcb'
import { Investment, InvestmentSnapshot, InvestmentType } from '@prisma/client'

interface CdiComparisonRequest {
  userId: string
  investmentType?: InvestmentType
}

interface CdiComparisonPoint {
  date: string
  actual: number
  cdi: number
  invested: number
}

interface CdiComparisonSummary {
  totalInvested: number
  currentValue: number
  cdiValue: number
  actualReturn: number
  cdiReturn: number
  actualReturnPct: number
  cdiReturnPct: number
  /** Rendimento real como % do que o CDI teria rendido (null se CDI ~0) */
  percentOfCdi: number | null
}

interface CdiComparisonResponse {
  series: CdiComparisonPoint[]
  summary: CdiComparisonSummary | null
}

type InvestmentWithSnapshots = Investment & { snapshots: InvestmentSnapshot[] }

function toIsoDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getEffectiveAmount(inv: Investment): number {
  const amount = Number(inv.amount || 0)
  if ((inv.investment_type === 'ETF' || inv.investment_type === 'FII') && inv.quantity) {
    return amount * Number(inv.quantity)
  }
  return amount
}

// Compara a evolução real dos investimentos (via snapshots) com o que o mesmo
// dinheiro teria rendido a 100% do CDI desde a data de aplicação de cada um.
export class GetCdiComparisonService {
  async execute({ userId, investmentType }: CdiComparisonRequest): Promise<CdiComparisonResponse> {
    const investments = (await prisma.investment.findMany({
      where: {
        user_id: userId,
        status: 'ACTIVE',
        ...(investmentType ? { investment_type: investmentType } : {}),
      },
      include: {
        snapshots: { orderBy: { recorded_at: 'asc' } },
      },
    })) as InvestmentWithSnapshots[]

    if (investments.length === 0) {
      return { series: [], summary: null }
    }

    const today = toIsoDate(new Date())

    const items = investments.map((inv) => {
      const start = toIsoDate(inv.purchase_date ?? inv.date)
      const invested = getEffectiveAmount(inv)
      return {
        start: start > today ? today : start,
        invested,
        current: inv.gross_yield ? Number(inv.gross_yield) : invested,
        snapshots: inv.snapshots.map((snap) => ({
          date: toIsoDate(snap.recorded_at),
          value: Number(snap.gross_yield),
        })),
      }
    })

    const earliestStart = items.reduce(
      (min, item) => (item.start < min ? item.start : min),
      today,
    )

    const cdiSeries = await getCdiCumulativeSeries(earliestStart)

    // Eixo de datas: inícios de aplicação + snapshots + amostras mensais
    // (para a curva do CDI não virar uma reta entre snapshots esparsos) + hoje.
    const dates = new Set<string>([today])
    for (const item of items) {
      dates.add(item.start)
      for (const snap of item.snapshots) {
        if (snap.date >= item.start && snap.date <= today) dates.add(snap.date)
      }
    }
    for (
      let cursor = new Date(`${earliestStart.slice(0, 7)}-01T00:00:00Z`);
      toIsoDate(cursor) <= today;
      cursor.setUTCMonth(cursor.getUTCMonth() + 1)
    ) {
      const iso = toIsoDate(cursor)
      if (iso >= earliestStart) dates.add(iso)
    }

    const axis = Array.from(dates).sort()

    const series: CdiComparisonPoint[] = axis.map((date) => {
      let actual = 0
      let cdi = 0
      let invested = 0

      for (const item of items) {
        if (item.start > date) continue

        invested += item.invested
        cdi += item.invested * cdiFactorBetween(cdiSeries, item.start, date)

        if (date === today) {
          actual += item.current
          continue
        }
        let value = item.invested
        for (const snap of item.snapshots) {
          if (snap.date > date) break
          value = snap.value
        }
        actual += value
      }

      return {
        date,
        actual: Math.round(actual * 100) / 100,
        cdi: Math.round(cdi * 100) / 100,
        invested: Math.round(invested * 100) / 100,
      }
    })

    const last = series[series.length - 1]
    const actualReturn = last.actual - last.invested
    const cdiReturn = last.cdi - last.invested

    const summary: CdiComparisonSummary = {
      totalInvested: last.invested,
      currentValue: last.actual,
      cdiValue: last.cdi,
      actualReturn,
      cdiReturn,
      actualReturnPct: last.invested > 0 ? (actualReturn / last.invested) * 100 : 0,
      cdiReturnPct: last.invested > 0 ? (cdiReturn / last.invested) * 100 : 0,
      percentOfCdi: cdiReturn > 0.01 ? (actualReturn / cdiReturn) * 100 : null,
    }

    return { series, summary }
  }
}
