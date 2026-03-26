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
      }))
    }
  }
}