import { PrismaInvestmentRepository } from '@/repositories/prisma/prisma-investment-repository'
import { GetInvestmentQuotesService } from '../get-investment-quotes'

export function makeGetInvestmentQuotesService() {
  const investmentRepository = new PrismaInvestmentRepository()
  return new GetInvestmentQuotesService(investmentRepository)
}
