import { InvestmentRepository } from '@/repositories/investment-repository'
import { Investment } from '@prisma/client'

interface PortfolioSummary {
  totalInvested: number
  currentValue: number
  totalReturn: number
  returnPercentage: number
  lastUpdated: string
}

interface GetInvestmentPortfolioUnifiedResponse {
  summary: PortfolioSummary
  allInvestments: Investment[]
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
      allInvestments
    }
  }

  private calculateSummary(investments: Investment[]): PortfolioSummary {
    const totalInvested = investments.reduce((sum, inv) => {
      return sum + Number(inv.amount || 0)
    }, 0)

    // Para valor atual, usar gross_yield ou valor investido
    const currentValue = investments.reduce((sum, inv) => {
      const value = inv.gross_yield || inv.amount || 0
      return sum + Number(value)
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
      totalReturn,
      returnPercentage,
      lastUpdated: lastUpdated.toISOString()
    }
  }
}