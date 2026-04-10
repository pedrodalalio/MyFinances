import { InvestmentRepository } from '@/repositories/investment-repository'
import { InvestmentType } from '@prisma/client'
import { prisma } from '@/lib/prisma'

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
  ticker?: string
  dividendYield?: number
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
    ticker,
    dividendYield,
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
      ticker,
      dividendYield,
      notes,
      userId
    })

    // Criar snapshot inicial para o histórico
    const effectiveAmount = investmentType === 'ETF' && quantity
      ? amount * quantity
      : amount
    await prisma.investmentSnapshot.create({
      data: {
        investment_id: investment.id,
        gross_yield: grossYield ?? effectiveAmount,
        net_value: netValue ?? null,
      }
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