import { PrismaExpenseRepository } from '@/repositories/prisma/prisma-expense-repository'
import { PrismaMonthlyInvestmentRepository } from '@/repositories/prisma/prisma-monthly-investment-repository'
import { PrismaSalaryProfilesRepository } from '@/repositories/prisma/prisma-salary-profiles-repository'
import { PrismaInvestmentPortfolioRepository } from '@/repositories/prisma/prisma-investment-portfolio-repository'
import { DashboardSummaryService } from '../dashboard-summary'
import { makeGetMonthlyExpensesService } from './make-get-monthly-expenses-service'

export function makeDashboardSummaryService() {
  const expenseRepository = new PrismaExpenseRepository()
  const monthlyInvestmentRepository = new PrismaMonthlyInvestmentRepository()
  const salaryRepository = new PrismaSalaryProfilesRepository()
  const investmentPortfolioRepository = new PrismaInvestmentPortfolioRepository()
  const getMonthlyExpensesService = makeGetMonthlyExpensesService()

  const service = new DashboardSummaryService(
    expenseRepository,
    monthlyInvestmentRepository,
    salaryRepository,
    investmentPortfolioRepository,
    getMonthlyExpensesService,
  )

  return service
}