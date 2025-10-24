import { PrismaInvestmentPortfolioRepository } from '@/repositories/prisma/prisma-investment-portfolio-repository'
import { PrismaPortfolioAssetRepository } from '@/repositories/prisma/prisma-portfolio-asset-repository'
import { PrismaAssetHistoryRepository } from '@/repositories/prisma/prisma-asset-history-repository'
import { CreatePortfolioAssetService } from '../create-portfolio-asset'

export function makeCreatePortfolioAssetService() {
  const investmentPortfolioRepository = new PrismaInvestmentPortfolioRepository()
  const portfolioAssetRepository = new PrismaPortfolioAssetRepository()
  const assetHistoryRepository = new PrismaAssetHistoryRepository()

  const service = new CreatePortfolioAssetService(
    investmentPortfolioRepository,
    portfolioAssetRepository,
    assetHistoryRepository
  )

  return service
}