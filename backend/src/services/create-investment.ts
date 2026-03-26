import { InvestmentRepository } from '@/repositories/investment-repository'
import { InvestmentType } from '@prisma/client'

interface CreateInvestmentServiceRequest {
  name: string
  description?: string
  amount: number
  netValue?: number
  grossYield?: number
  investmentType: InvestmentType
  category?: string
  date?: Date
  purchaseDate?: Date
  maturityDate?: Date
  interestRate?: number
  quantity?: number
  broker?: string
  notes?: string
  userId: string
}

interface CreateInvestmentServiceResponse {
  investment: {
    id: string
    name: string
    description: string | null
    amount: number
    investment_type: InvestmentType
    category: string | null
    date: Date
  }
}

export class CreateInvestmentService {
  constructor(
    private investmentRepository: InvestmentRepository
  ) {}

  async execute({
    name,
    description,
    amount,
    netValue,
    grossYield,
    investmentType,
    category,
    date,
    purchaseDate,
    maturityDate,
    interestRate,
    quantity,
    broker,
    notes,
    userId
  }: CreateInvestmentServiceRequest): Promise<CreateInvestmentServiceResponse> {
    const investment = await this.investmentRepository.create({
      name,
      description,
      amount,
      netValue,
      grossYield,
      investmentType,
      category,
      date,
      purchaseDate,
      maturityDate,
      interestRate,
      quantity,
      broker,
      notes,
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
        date: investment.date
      }
    }
  }
}