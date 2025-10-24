import { PrismaInvestmentPortfolioRepository } from '@/repositories/prisma/prisma-investment-portfolio-repository'
import { PrismaPortfolioAssetRepository } from '@/repositories/prisma/prisma-portfolio-asset-repository'
import { DeletePortfolioAssetService } from '../delete-portfolio-asset'

export function makeDeletePortfolioAssetService() {
  const investmentPortfolioRepository = new PrismaInvestmentPortfolioRepository()
  const portfolioAssetRepository = new PrismaPortfolioAssetRepository()

  const service = new DeletePortfolioAssetService(
    investmentPortfolioRepository,
    portfolioAssetRepository
  )

  return service
}