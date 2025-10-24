import { ExpenseRepository } from '@/repositories/expense-repository'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

interface DeleteExpenseServiceRequest {
  id: string
  userId: string
}

export class DeleteExpenseService {
  constructor(private expenseRepository: ExpenseRepository) {}

  async execute({ id, userId }: DeleteExpenseServiceRequest): Promise<void> {
    const existingExpense = await this.expenseRepository.findById(id)

    if (!existingExpense || existingExpense.user_id !== userId) {
      throw new ResourceNotFoundError()
    }

    await this.expenseRepository.delete(id, userId)
  }
}