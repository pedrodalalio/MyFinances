import { PrismaExpenseRepository } from '@/repositories/prisma/prisma-expense-repository'
import { ExpensesByCategoryService } from '../expenses-by-category'

export function makeExpensesByCategoryService() {
  const expenseRepository = new PrismaExpenseRepository()

  const service = new ExpensesByCategoryService(
    expenseRepository,
  )

  return service
}