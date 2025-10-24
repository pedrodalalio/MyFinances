import { MonthlyInvestmentRepository } from '@/repositories/monthly-investment-repository'
import { InvestmentType } from '@prisma/client'

interface GetMonthlyInvestmentsByMonthServiceRequest {
  userId: string
  month: string
  year: number
}

interface GetMonthlyInvestmentsByMonthServiceResponse {
  investments: {
    id: string
    name: string
    description: string | null
    amount: number
    investment_type: InvestmentType
    category: string | null
    month: string
    year: number
    date: Date
  }[]
}

export class GetMonthlyInvestmentsByMonthService {
  constructor(
    private monthlyInvestmentRepository: MonthlyInvestmentRepository
  ) {}

  async execute({
    userId,
    month,
    year
  }: GetMonthlyInvestmentsByMonthServiceRequest): Promise<GetMonthlyInvestmentsByMonthServiceResponse> {
    const investments = await this.monthlyInvestmentRepository.findByMonthAndUser(userId, month, year)

    return {
      investments: investments.map(investment => ({
        id: investment.id,
        name: investment.name,
        description: investment.description,
        amount: Number(investment.amount),
        investment_type: investment.investment_type,
        category: investment.category,
        month: investment.month,
        year: investment.year,
        date: investment.date
      }))
    }
  }
}