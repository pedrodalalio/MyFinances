import { Expense, PaymentMethod } from '@prisma/client'

export type ExpenseWithRecurring = Expense & {
  is_recurring?: boolean
  recurring_id?: string
}

export interface CreateExpenseData {
  name: string
  description?: string
  amount: number
  paymentMethod: PaymentMethod
  category?: string
  month: string
  year: number
  date: Date
  userId: string
}

export interface UpdateExpenseData {
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

export interface ExpenseRepository {
  create(data: CreateExpenseData): Promise<Expense>
  findByMonthAndUser(userId: string, month: string, year: number): Promise<ExpenseWithRecurring[]>
  findById(id: string): Promise<Expense | null>
  update(data: UpdateExpenseData): Promise<Expense>
  delete(id: string, userId: string): Promise<void>
}