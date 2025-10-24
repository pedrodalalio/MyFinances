import { Expense, PaymentMethod } from '@prisma/client'
import { ExpenseRepository } from '@/repositories/expense-repository'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

interface UpdateExpenseServiceRequest {
  id: string
  userId: string
  name?: string
  description?: string
  amount?: number
  paymentMethod?: PaymentMethod
  category?: string
  month?: string
  year?: number
  date?: Date
}

interface UpdateExpenseServiceResponse {
  expense: Expense
}

export class UpdateExpenseService {
  constructor(private expenseRepository: ExpenseRepository) {}

  async execute(data: UpdateExpenseServiceRequest): Promise<UpdateExpenseServiceResponse> {
    const existingExpense = await this.expenseRepository.findById(data.id)

    if (!existingExpense || existingExpense.user_id !== data.userId) {
      throw new ResourceNotFoundError()
    }

    const expense = await this.expenseRepository.update(data)

    return {
      expense
    }
  }
}