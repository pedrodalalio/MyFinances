import { PrismaInvestmentRepository } from '@/repositories/prisma/prisma-investment-repository'
import { GetFiiRankingService } from '../get-fii-ranking'

export function makeGetFiiRankingService() {
  const investmentRepository = new PrismaInvestmentRepository()
  return new GetFiiRankingService(investmentRepository)
}
