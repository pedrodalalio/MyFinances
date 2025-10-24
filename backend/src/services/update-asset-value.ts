import { InvestmentPortfolioRepository, PortfolioAssetRepository, AssetHistoryRepository } from '@/repositories/investment-portfolio-repository'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

interface UpdateAssetValueServiceRequest {
  assetId: string
  currentValue: number
  notes?: string
  userId: string
}

interface UpdateAssetValueServiceResponse {
  asset: any
  history: any
}

export class UpdateAssetValueService {
  constructor(
    private investmentPortfolioRepository: InvestmentPortfolioRepository,
    private portfolioAssetRepository: PortfolioAssetRepository,
    private assetHistoryRepository: AssetHistoryRepository
  ) {}

  async execute({
    assetId,
    currentValue,
    notes,
    userId
  }: UpdateAssetValueServiceRequest): Promise<UpdateAssetValueServiceResponse> {
    const asset = await this.portfolioAssetRepository.findById(assetId)

    if (!asset) {
      throw new ResourceNotFoundError()
    }

    // Verifica se o asset pertence ao usuário
    if (asset.portfolio.user_id !== userId) {
      throw new ResourceNotFoundError()
    }

    // Atualiza o valor do asset
    const updatedAsset = await this.portfolioAssetRepository.update({
      assetId,
      currentValue
    })

    // Adiciona entrada no histórico
    const history = await this.assetHistoryRepository.create({
      assetId,
      value: currentValue,
      date: new Date(),
      notes
    })

    // Atualiza os totais do portfolio
    const assets = await this.portfolioAssetRepository.findByPortfolioId(asset.portfolio_id)
    const totalInvested = assets.reduce((sum, a) => sum + Number(a.initial_investment), 0)
    const totalCurrentValue = assets.reduce((sum, a) => sum + Number(a.current_value), 0)

    await this.investmentPortfolioRepository.updatePortfolioTotals(
      asset.portfolio_id,
      totalInvested,
      totalCurrentValue
    )

    return {
      asset: {
        id: updatedAsset.id,
        name: updatedAsset.name,
        asset_type: updatedAsset.asset_type,
        initial_investment: Number(updatedAsset.initial_investment),
        current_value: Number(updatedAsset.current_value),
        quantity: updatedAsset.quantity ? Number(updatedAsset.quantity) : null,
        purchase_date: updatedAsset.purchase_date,
        maturity_date: updatedAsset.maturity_date,
        interest_rate: updatedAsset.interest_rate ? Number(updatedAsset.interest_rate) : null,
        status: updatedAsset.status,
        notes: updatedAsset.notes,
        broker: updatedAsset.broker
      },
      history: {
        id: history.id,
        value: Number(history.value),
        date: history.date,
        notes: history.notes
      }
    }
  }
}