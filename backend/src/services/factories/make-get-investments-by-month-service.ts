import { PrismaInvestmentRepository } from '@/repositories/prisma/prisma-investment-repository'
import { GetInvestmentsByMonthService } from '../get-investments-by-month'

export function makeGetInvestmentsByMonthService() {
  const investmentRepository = new PrismaInvestmentRepository()
  const service = new GetInvestmentsByMonthService(investmentRepository)

  return service
}