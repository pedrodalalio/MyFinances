import { MonthlyInvestmentRepository } from '@/repositories/monthly-investment-repository'
import { InvestmentType } from '@prisma/client'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

interface UpdateMonthlyInvestmentServiceRequest {
  investmentId: string
  name?: string
  description?: string
  amount?: number
  investmentType?: InvestmentType
  category?: string
  month?: string
  year?: number
  date?: Date
  userId: string
}

interface UpdateMonthlyInvestmentServiceResponse {
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

export class UpdateMonthlyInvestmentService {
  constructor(
    private monthlyInvestmentRepository: MonthlyInvestmentRepository
  ) {}

  async execute({
    investmentId,
    name,
    description,
    amount,
    investmentType,
    category,
    month,
    year,
    date,
    userId
  }: UpdateMonthlyInvestmentServiceRequest): Promise<UpdateMonthlyInvestmentServiceResponse> {
    const investmentExists = await this.monthlyInvestmentRepository.findById(investmentId)

    if (!investmentExists) {
      throw new ResourceNotFoundError()
    }

    const investment = await this.monthlyInvestmentRepository.update({
      id: investmentId,
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