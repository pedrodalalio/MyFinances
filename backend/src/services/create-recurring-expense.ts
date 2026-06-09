import { PaymentMethod, RecurringExpense } from '@prisma/client'
import { RecurringExpenseRepository } from '@/repositories/recurring-expense-repository'

interface CreateRecurringExpenseServiceRequest {
  userId: string
  name: string
  description?: string
  amount: number
  paymentMethod: PaymentMethod
  category?: string
  dayOfMonth: number
  startMonth: string
  startYear: number
  endMonth?: string | null
  endYear?: number | null
}

interface CreateRecurringExpenseServiceResponse {
  recurringExpense: RecurringExpense
}

export class CreateRecurringExpenseService {
  constructor(private recurringExpenseRepository: RecurringExpenseRepository) {}

  async execute(
    data: CreateRecurringExpenseServiceRequest,
  ): Promise<CreateRecurringExpenseServiceResponse> {
    const recurringExpense = await this.recurringExpenseRepository.create({
      name: data.name,
      description: data.description,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      category: data.category,
      dayOfMonth: data.dayOfMonth,
      startMonth: data.startMonth,
      startYear: data.startYear,
      endMonth: data.endMonth,
      endYear: data.endYear,
      userId: data.userId,
    })

    return { recurringExpense }
  }
}
