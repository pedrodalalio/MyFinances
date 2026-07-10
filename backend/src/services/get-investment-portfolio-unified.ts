import { InvestmentRepository } from '@/repositories/investment-repository'
import { Investment } from '@prisma/client'

interface PortfolioSummary {
  totalInvested: number
  currentValue: number
  netValue: number
  totalReturn: number
  returnPercentage: number
  lastUpdated: string
}

interface SerializedInvestment {
  id: string
  name: string
  description: string | null
  amount: number
  gross_yield: number | null
  net_value: number | null
  investment_type: string
  category: string | null
  date: Date
  purchase_date: Date | null
  maturity_date: Date | null
  interest_rate: number | null
  quantity: number | null
  broker: string | null
  ticker: string | null
  status: string
  is_reserve: boolean
  notes: string | null
  updated_at: Date
}

interface GetInvestmentPortfolioUnifiedResponse {
  summary: PortfolioSummary
  allInvestments: SerializedInvestment[]
}

export class GetInvestmentPortfolioUnifiedService {
  constructor(private investmentRepository: InvestmentRepository) {}

  async execute(userId: string): Promise<GetInvestmentPortfolioUnifiedResponse> {
    // Buscar todos os investimentos
    const allInvestments = await this.investmentRepository.findAllPortfolioByUser(userId)

    // Calcular resumo geral
    const summary = this.calculateSummary(allInvestments)

    return {
      summary,
      allInvestments: allInvestments.map(inv => ({
        id: inv.id,
        name: inv.name,
        description: inv.description,
        amount: Number(inv.amount),
        gross_yield: inv.gross_yield ? Number(inv.gross_yield) : null,
        net_value: inv.net_value ? Number(inv.net_value) : null,
        investment_type: inv.investment_type,
        category: inv.category,
        date: inv.date,
        purchase_date: inv.purchase_date,
        maturity_date: inv.maturity_date,
        interest_rate: inv.interest_rate ? Number(inv.interest_rate) : null,
        quantity: inv.quantity ? Number(inv.quantity) : null,
        broker: inv.broker,
        ticker: inv.ticker,
        status: inv.status,
        is_reserve: inv.is_reserve,
        notes: inv.notes,
        updated_at: inv.updated_at,
      }))
    }
  }

  private getEffectiveAmount(inv: Investment): number {
    const amount = Number(inv.amount || 0)
    if ((inv.investment_type === 'ETF' || inv.investment_type === 'FII') && inv.quantity) {
      return amount * Number(inv.quantity)
    }
    return amount
  }

  private isCountableForSummary(inv: Investment): boolean {
    if (inv.status !== 'ACTIVE') return false
    if (inv.maturity_date && inv.maturity_date.getTime() <= Date.now()) return false
    return true
  }

  private calculateSummary(investments: Investment[]): PortfolioSummary {
    const countable = investments.filter(inv => this.isCountableForSummary(inv))

    const totalInvested = countable.reduce((sum, inv) => {
      return sum + this.getEffectiveAmount(inv)
    }, 0)

    // Para valor atual, usar gross_yield ou valor investido
    const currentValue = countable.reduce((sum, inv) => {
      const effectiveAmount = this.getEffectiveAmount(inv)
      const value = inv.gross_yield ? Number(inv.gross_yield) : effectiveAmount
      return sum + value
    }, 0)

    const netValue = countable.reduce((sum, inv) => {
      const effectiveAmount = this.getEffectiveAmount(inv)
      const value = inv.net_value ? Number(inv.net_value) : (inv.gross_yield ? Number(inv.gross_yield) : effectiveAmount)
      return sum + value
    }, 0)

    const totalReturn = currentValue - totalInvested
    const returnPercentage = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0

    const lastUpdated = investments.reduce((latest, inv) => {
      const invDate = inv.updated_at
      return invDate > latest ? invDate : latest
    }, new Date(0))

    return {
      totalInvested,
      currentValue,
      netValue,
      totalReturn,
      returnPercentage,
      lastUpdated: lastUpdated.toISOString()
    }
  }
}