import { InvestmentPortfolioRepository, PortfolioAssetRepository } from '@/repositories/investment-portfolio-repository'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

interface DeletePortfolioAssetServiceRequest {
  assetId: string
  userId: string
}

export class DeletePortfolioAssetService {
  constructor(
    private investmentPortfolioRepository: InvestmentPortfolioRepository,
    private portfolioAssetRepository: PortfolioAssetRepository
  ) {}

  async execute({
    assetId,
    userId
  }: DeletePortfolioAssetServiceRequest): Promise<void> {
    const asset = await this.portfolioAssetRepository.findById(assetId)

    if (!asset) {
      throw new ResourceNotFoundError()
    }

    // Verifica se o asset pertence ao usuário
    if (asset.portfolio.user_id !== userId) {
      throw new ResourceNotFoundError()
    }

    const portfolioId = asset.portfolio_id

    // Deleta o asset
    await this.portfolioAssetRepository.delete(assetId)

    // Atualiza os totais do portfolio
    const assets = await this.portfolioAssetRepository.findByPortfolioId(portfolioId)
    const totalInvested = assets.reduce((sum, a) => sum + Number(a.initial_investment), 0)
    const totalCurrentValue = assets.reduce((sum, a) => sum + Number(a.current_value), 0)

    await this.investmentPortfolioRepository.updatePortfolioTotals(
      portfolioId,
      totalInvested,
      totalCurrentValue
    )
  }
}