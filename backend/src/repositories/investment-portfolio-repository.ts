import { AssetType, AssetStatus } from '@prisma/client'

export interface CreatePortfolioAssetRequest {
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
  portfolioId: string
}

export interface UpdatePortfolioAssetRequest {
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
}

export interface CreateAssetHistoryRequest {
  assetId: string
  value: number
  date: Date
  notes?: string
}

export interface InvestmentPortfolioRepository {
  findByUserId(userId: string): Promise<any>
  createPortfolio(userId: string): Promise<any>
  updatePortfolioTotals(portfolioId: string, totalInvested: number, currentValue: number): Promise<any>
}

export interface PortfolioAssetRepository {
  create(data: CreatePortfolioAssetRequest): Promise<any>
  findById(assetId: string): Promise<any>
  findByPortfolioId(portfolioId: string): Promise<any[]>
  update(data: UpdatePortfolioAssetRequest): Promise<any>
  delete(assetId: string): Promise<void>
}

export interface AssetHistoryRepository {
  create(data: CreateAssetHistoryRequest): Promise<any>
  findByAssetId(assetId: string): Promise<any[]>
}