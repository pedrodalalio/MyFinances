import { RecurringExpense } from '@prisma/client'
import { RecurringExpenseRepository } from '@/repositories/recurring-expense-repository'

interface ListRecurringExpensesServiceRequest {
  userId: string
}

interface ListRecurringExpensesServiceResponse {
  recurringExpenses: RecurringExpense[]
}

export class ListRecurringExpensesService {
  constructor(private recurringExpenseRepository: RecurringExpenseRepository) {}

  async execute({
    userId,
  }: ListRecurringExpensesServiceRequest): Promise<ListRecurringExpensesServiceResponse> {
    const recurringExpenses = await this.recurringExpenseRepository.findManyByUser(userId)

    return { recurringExpenses }
  }
}
