import { PrismaInvestmentRepository } from '@/repositories/prisma/prisma-investment-repository'
import { UpdateInvestmentService } from '../update-investment'

export function makeUpdateInvestmentService() {
  const investmentRepository = new PrismaInvestmentRepository()
  const service = new UpdateInvestmentService(investmentRepository)

  return service
}