import { Expense, PaymentMethod } from '@prisma/client'
import { ExpenseRepository } from '@/repositories/expense-repository'

interface CreateExpenseServiceRequest {
  userId: string
  name: string
  description?: string
  amount: number
  paymentMethod: PaymentMethod
  category?: string
  month: string
  year: number
  date: Date
}

interface CreateExpenseServiceResponse {
  expense: Expense
}

export class CreateExpenseService {
  constructor(private expenseRepository: ExpenseRepository) {}

  async execute({
    userId,
    name,
    description,
    amount,
    paymentMethod,
    category,
    month,
    year,
    date
  }: CreateExpenseServiceRequest): Promise<CreateExpenseServiceResponse> {
    const expense = await this.expenseRepository.create({
      userId,
      name,
      description,
      amount,
      paymentMethod,
      category,
      month,
      year,
      date
    })

    return {
      expense
    }
  }
}