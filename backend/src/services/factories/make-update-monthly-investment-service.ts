import { PrismaMonthlyInvestmentRepository } from '@/repositories/prisma/prisma-monthly-investment-repository'
import { UpdateMonthlyInvestmentService } from '../update-monthly-investment'

export function makeUpdateMonthlyInvestmentService() {
  const monthlyInvestmentRepository = new PrismaMonthlyInvestmentRepository()
  const service = new UpdateMonthlyInvestmentService(monthlyInvestmentRepository)

  return service
}