import { PrismaInvestmentRepository } from '@/repositories/prisma/prisma-investment-repository'
import { CreateInvestmentService } from '../create-investment'

export function makeCreateInvestmentService() {
  const investmentRepository = new PrismaInvestmentRepository()
  const service = new CreateInvestmentService(investmentRepository)

  return service
}