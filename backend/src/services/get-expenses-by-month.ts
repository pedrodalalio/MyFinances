import { Expense } from '@prisma/client'
import { ExpenseRepository } from '@/repositories/expense-repository'

interface GetExpensesByMonthServiceRequest {
  userId: string
  month: string
  year: number
}

interface GetExpensesByMonthServiceResponse {
  expenses: Expense[]
}

export class GetExpensesByMonthService {
  constructor(private expenseRepository: ExpenseRepository) {}

  async execute({
    userId,
    month,
    year
  }: GetExpensesByMonthServiceRequest): Promise<GetExpensesByMonthServiceResponse> {
    const expenses = await this.expenseRepository.findByMonthAndUser(userId, month, year)

    return {
      expenses
    }
  }
}