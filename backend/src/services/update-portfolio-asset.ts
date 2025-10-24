import { InvestmentPortfolioRepository, PortfolioAssetRepository } from '@/repositories/investment-portfolio-repository'
import { AssetType, AssetStatus } from '@prisma/client'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

interface UpdatePortfolioAssetServiceRequest {
  assetId: string
  name?: string
  assetType?: AssetType
  initialInvestment?: number
  currentValue?: number
  quantity?: number
  purchaseDate?: Date
  maturityDate?: Date
  interestRate?: number
  status?: AssetStatus
  notes?: string
  broker?: string
  userId: string
}

interface UpdatePortfolioAssetServiceResponse {
  asset: any
}

export class UpdatePortfolioAssetService {
  constructor(
    private investmentPortfolioRepository: InvestmentPortfolioRepository,
    private portfolioAssetRepository: PortfolioAssetRepository
  ) {}

  async execute({
    assetId,
    name,
    assetType,
    initialInvestment,
    currentValue,
    quantity,
    purchaseDate,
    maturityDate,
    interestRate,
    status,
    notes,
    broker,
    userId
  }: UpdatePortfolioAssetServiceRequest): Promise<UpdatePortfolioAssetServiceResponse> {
    const asset = await this.portfolioAssetRepository.findById(assetId)

    if (!asset) {
      throw new ResourceNotFoundError()
    }

    // Verifica se o asset pertence ao usuário
    if (asset.portfolio.user_id !== userId) {
      throw new ResourceNotFoundError()
    }

    const updatedAsset = await this.portfolioAssetRepository.update({
      assetId,
      name,
      assetType,
      initialInvestment,
      currentValue,
      quantity,
      purchaseDate,
      maturityDate,
      interestRate,
      status,
      notes,
      broker
    })

    // Atualiza os totais do portfolio se o valor foi alterado
    if (initialInvestment !== undefined || currentValue !== undefined) {
      const assets = await this.portfolioAssetRepository.findByPortfolioId(asset.portfolio_id)
      const totalInvested = assets.reduce((sum, a) => sum + Number(a.initial_investment), 0)
      const totalCurrentValue = assets.reduce((sum, a) => sum + Number(a.current_value), 0)

      await this.investmentPortfolioRepository.updatePortfolioTotals(
        asset.portfolio_id,
        totalInvested,
        totalCurrentValue
      )
    }

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
      }
    }
  }
}