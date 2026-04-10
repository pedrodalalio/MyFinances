import { prisma } from '@/lib/prisma'

interface InvestmentHistoryRequest {
  userId: string
}

interface SnapshotPoint {
  date: string
  grossYield: number
  netValue: number | null
}

interface InvestmentHistory {
  id: string
  name: string
  investmentType: string
  history: SnapshotPoint[]
}

interface InvestmentHistoryResponse {
  investments: InvestmentHistory[]
}

export class GetInvestmentHistoryService {
  async execute({ userId }: InvestmentHistoryRequest): Promise<InvestmentHistoryResponse> {
    const investments = await prisma.investment.findMany({
      where: {
        user_id: userId,
        status: 'ACTIVE',
      },
      include: {
        snapshots: {
          orderBy: { recorded_at: 'asc' },
        },
      },
    })

    const result: InvestmentHistory[] = investments
      .filter(inv => inv.snapshots.length > 0)
      .map(inv => {
        const history: SnapshotPoint[] = inv.snapshots.map(snap => ({
          date: snap.recorded_at.toISOString().split('T')[0],
          grossYield: Number(snap.gross_yield),
          netValue: snap.net_value ? Number(snap.net_value) : null,
        }))

        return {
          id: inv.id,
          name: inv.name,
          investmentType: inv.investment_type,
          history,
        }
      })

    return { investments: result }
  }
}
