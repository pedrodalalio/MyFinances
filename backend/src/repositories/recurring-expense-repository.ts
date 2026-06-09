import { RecurringExpense, PaymentMethod } from '@prisma/client'

export interface CreateRecurringExpenseData {
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
  userId: string
}

export interface UpdateRecurringExpenseData {
  id: string
  name?: string
  description?: string
  amount?: number
  paymentMethod?: PaymentMethod
  category?: string
  dayOfMonth?: number
  startMonth?: string
  startYear?: number
  endMonth?: string | null
  endYear?: number | null
}

export interface RecurringExpenseRepository {
  create(data: CreateRecurringExpenseData): Promise<RecurringExpense>
  findManyByUser(userId: string): Promise<RecurringExpense[]>
  findById(id: string): Promise<RecurringExpense | null>
  update(data: UpdateRecurringExpenseData): Promise<RecurringExpense>
  delete(id: string): Promise<void>
}
