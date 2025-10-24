import { PrismaMonthlyInvestmentRepository } from '@/repositories/prisma/prisma-monthly-investment-repository'
import { DeleteMonthlyInvestmentService } from '../delete-monthly-investment'

export function makeDeleteMonthlyInvestmentService() {
  const monthlyInvestmentRepository = new PrismaMonthlyInvestmentRepository()
  const service = new DeleteMonthlyInvestmentService(monthlyInvestmentRepository)

  return service
}