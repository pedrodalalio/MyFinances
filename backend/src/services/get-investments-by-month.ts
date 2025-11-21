import { InvestmentRepository } from '@/repositories/investment-repository'
import { InvestmentType } from '@prisma/client'

interface GetInvestmentsByMonthServiceRequest {
  userId: string
  month: string
  year: number
}

interface GetInvestmentsByMonthServiceResponse {
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

export class GetInvestmentsByMonthService {
  constructor(
    private investmentRepository: InvestmentRepository
  ) {}

  async execute({
    userId,
    month,
    year
  }: GetInvestmentsByMonthServiceRequest): Promise<GetInvestmentsByMonthServiceResponse> {
    const investments = await this.investmentRepository.findByMonthAndUser(userId, month, year)

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