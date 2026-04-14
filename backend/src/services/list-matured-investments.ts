import { InvestmentRepository } from '@/repositories/investment-repository'

interface MaturedInvestment {
  id: string
  name: string
  description: string | null
  investment_type: string
  category: string | null
  amount: number
  gross_yield: number | null
  net_value: number | null
  interest_rate: number | null
  quantity: number | null
  broker: string | null
  ticker: string | null
  purchase_date: Date | null
  maturity_date: Date | null
}

interface ListMaturedInvestmentsResponse {
  investments: MaturedInvestment[]
}

export class ListMaturedInvestmentsService {
  constructor(private investmentRepository: InvestmentRepository) {}

  async execute(userId: string): Promise<ListMaturedInvestmentsResponse> {
    const now = new Date()
    const investments = await this.investmentRepository.findMaturedPendingByUser(userId, now)

    return {
      investments: investments.map(inv => ({
        id: inv.id,
        name: inv.name,
        description: inv.description,
        investment_type: inv.investment_type,
        category: inv.category,
        amount: Number(inv.amount),
        gross_yield: inv.gross_yield ? Number(inv.gross_yield) : null,
        net_value: inv.net_value ? Number(inv.net_value) : null,
        interest_rate: inv.interest_rate ? Number(inv.interest_rate) : null,
        quantity: inv.quantity ? Number(inv.quantity) : null,
        broker: inv.broker,
        ticker: inv.ticker,
        purchase_date: inv.purchase_date,
        maturity_date: inv.maturity_date,
      }))
    }
  }
}
