import { PrismaInvestmentPortfolioRepository } from '@/repositories/prisma/prisma-investment-portfolio-repository'
import { GetInvestmentPortfolioService } from '../get-investment-portfolio'

export function makeGetInvestmentPortfolioService() {
  const investmentPortfolioRepository = new PrismaInvestmentPortfolioRepository()
  const service = new GetInvestmentPortfolioService(investmentPortfolioRepository)

  return service
}