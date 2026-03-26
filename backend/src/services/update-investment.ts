import { InvestmentRepository } from '@/repositories/investment-repository'
import { InvestmentType } from '@prisma/client'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

interface UpdateInvestmentServiceRequest {
  investmentId: string
  name?: string
  description?: string
  amount?: number
  netValue?: number
  grossYield?: number
  investmentType?: InvestmentType
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

interface UpdateInvestmentServiceResponse {
  investment: {
    id: string
    name: string
    description: string | null
    amount: number
    net_value: number | null
    investment_type: InvestmentType
    category: string | null
    date: Date
    purchase_date: Date | null
    maturity_date: Date | null
    interest_rate: number | null
    quantity: number | null
    broker: string | null
    gross_yield: number | null
    notes: string | null
  }
}

export class UpdateInvestmentService {
  constructor(
    private investmentRepository: InvestmentRepository
  ) {}

  async execute({
    investmentId,
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
  }: UpdateInvestmentServiceRequest): Promise<UpdateInvestmentServiceResponse> {
    const investmentExists = await this.investmentRepository.findById(investmentId)

    if (!investmentExists) {
      throw new ResourceNotFoundError()
    }

    const investment = await this.investmentRepository.update({
      id: investmentId,
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
        net_value: investment.net_value ? Number(investment.net_value) : null,
        investment_type: investment.investment_type,
        category: investment.category,
        date: investment.date,
        purchase_date: investment.purchase_date,
        maturity_date: investment.maturity_date,
        interest_rate: investment.interest_rate ? Number(investment.interest_rate) : null,
        quantity: investment.quantity ? Number(investment.quantity) : null,
        broker: investment.broker,
        gross_yield: investment.gross_yield ? Number(investment.gross_yield) : null,
        notes: investment.notes
      }
    }
  }
}