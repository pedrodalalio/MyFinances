import { randomUUID } from 'node:crypto'
import { Prisma, RecurringExpense } from '@prisma/client'
import {
  CreateRecurringExpenseData,
  UpdateRecurringExpenseData,
  RecurringExpenseRepository,
} from '../recurring-expense-repository'

export class InMemoryRecurringExpenseRepository implements RecurringExpenseRepository {
  public items: RecurringExpense[] = []

  async create(data: CreateRecurringExpenseData): Promise<RecurringExpense> {
    const item: RecurringExpense = {
      id: randomUUID(),
      name: data.name,
      description: data.description ?? null,
      amount: new Prisma.Decimal(data.amount),
      payment_method: data.paymentMethod,
      category: data.category ?? null,
      day_of_month: data.dayOfMonth,
      start_month: data.startMonth,
      start_year: data.startYear,
      end_month: data.endMonth ?? null,
      end_year: data.endYear ?? null,
      user_id: data.userId,
      created_at: new Date(),
      updated_at: new Date(),
    }

    this.items.push(item)

    return item
  }

  async findManyByUser(userId: string): Promise<RecurringExpense[]> {
    return this.items.filter((item) => item.user_id === userId)
  }

  async findById(id: string): Promise<RecurringExpense | null> {
    return this.items.find((item) => item.id === id) ?? null
  }

  async update(data: UpdateRecurringExpenseData): Promise<RecurringExpense> {
    const item = this.items.find((item) => item.id === data.id)

    if (!item) {
      throw new Error('Recurring expense not found')
    }

    if (data.name !== undefined) item.name = data.name
    if (data.description !== undefined) item.description = data.description
    if (data.amount !== undefined) item.amount = new Prisma.Decimal(data.amount)
    if (data.paymentMethod !== undefined) item.payment_method = data.paymentMethod
    if (data.category !== undefined) item.category = data.category
    if (data.dayOfMonth !== undefined) item.day_of_month = data.dayOfMonth
    if (data.startMonth !== undefined) item.start_month = data.startMonth
    if (data.startYear !== undefined) item.start_year = data.startYear
    if (data.endMonth !== undefined) item.end_month = data.endMonth
    if (data.endYear !== undefined) item.end_year = data.endYear
    item.updated_at = new Date()

    return item
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((item) => item.id !== id)
  }

  async closeAndCreateNext(
    closeId: string,
    end: { month: string; year: number },
    create: CreateRecurringExpenseData,
  ): Promise<RecurringExpense> {
    await this.update({ id: closeId, endMonth: end.month, endYear: end.year })

    return this.create(create)
  }
}
