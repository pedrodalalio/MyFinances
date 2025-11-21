import { PrismaInvestmentRepository } from '@/repositories/prisma/prisma-investment-repository'
import { GetInvestmentPortfolioUnifiedService } from '../get-investment-portfolio-unified'

export function makeGetInvestmentPortfolioUnifiedService() {
  const investmentRepository = new PrismaInvestmentRepository()
  const service = new GetInvestmentPortfolioUnifiedService(investmentRepository)

  return service
}