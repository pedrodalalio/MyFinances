import { PrismaMonthlyInvestmentRepository } from '@/repositories/prisma/prisma-monthly-investment-repository'
import { GetMonthlyInvestmentsByMonthService } from '../get-monthly-investments-by-month'

export function makeGetMonthlyInvestmentsByMonthService() {
  const monthlyInvestmentRepository = new PrismaMonthlyInvestmentRepository()
  const service = new GetMonthlyInvestmentsByMonthService(monthlyInvestmentRepository)

  return service
}