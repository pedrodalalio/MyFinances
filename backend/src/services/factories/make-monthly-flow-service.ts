import { PrismaExpenseRepository } from '@/repositories/prisma/prisma-expense-repository'
import { PrismaMonthlyInvestmentRepository } from '@/repositories/prisma/prisma-monthly-investment-repository'
import { PrismaSalaryProfilesRepository } from '@/repositories/prisma/prisma-salary-profiles-repository'
import { MonthlyFlowService } from '../monthly-flow'
import { makeGetMonthlyExpensesService } from './make-get-monthly-expenses-service'

export function makeMonthlyFlowService() {
  const expenseRepository = new PrismaExpenseRepository()
  const monthlyInvestmentRepository = new PrismaMonthlyInvestmentRepository()
  const salaryRepository = new PrismaSalaryProfilesRepository()
  const getMonthlyExpensesService = makeGetMonthlyExpensesService()

  const service = new MonthlyFlowService(
    expenseRepository,
    monthlyInvestmentRepository,
    salaryRepository,
    getMonthlyExpensesService,
  )

  return service
}