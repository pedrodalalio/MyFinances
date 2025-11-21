import { PrismaInvestmentRepository } from '@/repositories/prisma/prisma-investment-repository'
import { DeleteInvestmentService } from '../delete-investment'

export function makeDeleteInvestmentService() {
  const investmentRepository = new PrismaInvestmentRepository()
  const service = new DeleteInvestmentService(investmentRepository)

  return service
}