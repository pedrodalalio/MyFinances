import { PrismaMonthlyInvestmentRepository } from '@/repositories/prisma/prisma-monthly-investment-repository'
import { CreateMonthlyInvestmentService } from '../create-monthly-investment'

export function makeCreateMonthlyInvestmentService() {
  const monthlyInvestmentRepository = new PrismaMonthlyInvestmentRepository()
  const service = new CreateMonthlyInvestmentService(monthlyInvestmentRepository)

  return service
}