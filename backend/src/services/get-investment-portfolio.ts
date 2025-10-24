import { InvestmentPortfolioRepository } from '@/repositories/investment-portfolio-repository'

interface GetInvestmentPortfolioServiceRequest {
  userId: string
}

interface GetInvestmentPortfolioServiceResponse {
  portfolio: {
    id: string
    total_invested: number
    current_value: number
    total_return: number
    return_percentage: number
    last_updated: Date
    assets: any[]
  } | null
}

export class GetInvestmentPortfolioService {
  constructor(
    private investmentPortfolioRepository: InvestmentPortfolioRepository
  ) {}

  async execute({
    userId
  }: GetInvestmentPortfolioServiceRequest): Promise<GetInvestmentPortfolioServiceResponse> {
    let portfolio = await this.investmentPortfolioRepository.findByUserId(userId)

    // Se o usuário não tem portfolio, cria um novo
    if (!portfolio) {
      try {
        portfolio = await this.investmentPortfolioRepository.createPortfolio(userId)
      } catch (error) {
        // Se falhar (ex: já existe), tenta buscar novamente
        portfolio = await this.investmentPortfolioRepository.findByUserId(userId)
        if (!portfolio) {
          throw error // Se ainda não existe, relança o erro
        }
      }
    }

    return {
      portfolio: portfolio ? {
        id: portfolio.id,
        total_invested: Number(portfolio.total_invested),
        current_value: Number(portfolio.current_value),
        total_return: Number(portfolio.total_return),
        return_percentage: Number(portfolio.return_percentage),
        last_updated: portfolio.last_updated,
        assets: portfolio.assets.map((asset: any) => ({
          id: asset.id,
          name: asset.name,
          asset_type: asset.asset_type,
          initial_investment: Number(asset.initial_investment),
          current_value: Number(asset.current_value),
          quantity: asset.quantity ? Number(asset.quantity) : null,
          purchase_date: asset.purchase_date,
          maturity_date: asset.maturity_date,
          interest_rate: asset.interest_rate ? Number(asset.interest_rate) : null,
          status: asset.status,
          notes: asset.notes,
          broker: asset.broker,
          history: asset.history.map((h: any) => ({
            id: h.id,
            value: Number(h.value),
            date: h.date,
            notes: h.notes
          }))
        }))
      } : null
    }
  }
}