import { InvestmentPortfolioRepository, PortfolioAssetRepository, AssetHistoryRepository } from '@/repositories/investment-portfolio-repository'
import { AssetType } from '@prisma/client'

interface CreatePortfolioAssetServiceRequest {
  name: string
  assetType: AssetType
  initialInvestment: number
  currentValue: number
  quantity?: number
  purchaseDate: Date
  maturityDate?: Date
  interestRate?: number
  notes?: string
  broker?: string
  userId: string
}

interface CreatePortfolioAssetServiceResponse {
  asset: any
}

export class CreatePortfolioAssetService {
  constructor(
    private investmentPortfolioRepository: InvestmentPortfolioRepository,
    private portfolioAssetRepository: PortfolioAssetRepository,
    private assetHistoryRepository: AssetHistoryRepository
  ) {}

  async execute({
    name,
    assetType,
    initialInvestment,
    currentValue,
    quantity,
    purchaseDate,
    maturityDate,
    interestRate,
    notes,
    broker,
    userId
  }: CreatePortfolioAssetServiceRequest): Promise<CreatePortfolioAssetServiceResponse> {
    // Busca ou cria o portfolio do usuário
    let portfolio = await this.investmentPortfolioRepository.findByUserId(userId)

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

    // Cria o asset
    const asset = await this.portfolioAssetRepository.create({
      name,
      assetType,
      initialInvestment,
      currentValue,
      quantity,
      purchaseDate,
      maturityDate,
      interestRate,
      notes,
      broker,
      portfolioId: portfolio.id
    })

    // Adiciona entrada inicial no histórico
    await this.assetHistoryRepository.create({
      assetId: asset.id,
      value: currentValue,
      date: purchaseDate,
      notes: 'Valor inicial'
    })

    // Atualiza os totais do portfolio
    const assets = await this.portfolioAssetRepository.findByPortfolioId(portfolio.id)
    const totalInvested = assets.reduce((sum, a) => sum + Number(a.initial_investment), 0)
    const totalCurrentValue = assets.reduce((sum, a) => sum + Number(a.current_value), 0)

    await this.investmentPortfolioRepository.updatePortfolioTotals(
      portfolio.id,
      totalInvested,
      totalCurrentValue
    )

    return {
      asset: {
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
        broker: asset.broker
      }
    }
  }
}