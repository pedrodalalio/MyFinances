import { PrismaInvestmentPortfolioRepository } from '@/repositories/prisma/prisma-investment-portfolio-repository'
import { PrismaPortfolioAssetRepository } from '@/repositories/prisma/prisma-portfolio-asset-repository'
import { UpdatePortfolioAssetService } from '../update-portfolio-asset'

export function makeUpdatePortfolioAssetService() {
  const investmentPortfolioRepository = new PrismaInvestmentPortfolioRepository()
  const portfolioAssetRepository = new PrismaPortfolioAssetRepository()

  const service = new UpdatePortfolioAssetService(
    investmentPortfolioRepository,
    portfolioAssetRepository
  )

  return service
}