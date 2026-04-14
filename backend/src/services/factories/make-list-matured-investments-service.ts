import { PrismaInvestmentRepository } from '@/repositories/prisma/prisma-investment-repository'
import { ListMaturedInvestmentsService } from '../list-matured-investments'

export function makeListMaturedInvestmentsService() {
  const investmentRepository = new PrismaInvestmentRepository()
  return new ListMaturedInvestmentsService(investmentRepository)
}
