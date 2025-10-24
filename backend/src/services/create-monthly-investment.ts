import { MonthlyInvestmentRepository } from '@/repositories/monthly-investment-repository'
import { InvestmentType } from '@prisma/client'

interface CreateMonthlyInvestmentServiceRequest {
  name: string
  description?: string
  amount: number
  investmentType: InvestmentType
  category?: string
  month: string
  year: number
  date?: Date
  userId: string
}

interface CreateMonthlyInvestmentServiceResponse {
  investment: {
    id: string
    name: string
    description: string | null
    amount: number
    investment_type: InvestmentType
    category: string | null
    month: string
    year: number
    date: Date
  }
}

export class CreateMonthlyInvestmentService {
  constructor(
    private monthlyInvestmentRepository: MonthlyInvestmentRepository
  ) {}

  async execute({
    name,
    description,
    amount,
    investmentType,
    category,
    month,
    year,
    date,
    userId
  }: CreateMonthlyInvestmentServiceRequest): Promise<CreateMonthlyInvestmentServiceResponse> {
    const investment = await this.monthlyInvestmentRepository.create({
      name,
      description,
      amount,
      investmentType,
      category,
      month,
      year,
      date,
      userId
    })

    return {
      investment: {
        id: investment.id,
        name: investment.name,
        description: investment.description,
        amount: Number(investment.amount),
        investment_type: investment.investment_type,
        category: investment.category,
        month: investment.month,
        year: investment.year,
        date: investment.date
      }
    }
  }
}