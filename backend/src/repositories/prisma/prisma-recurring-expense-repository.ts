import { prisma } from '@/lib/prisma'
import { RecurringExpense } from '@prisma/client'
import {
  CreateRecurringExpenseData,
  UpdateRecurringExpenseData,
  RecurringExpenseRepository,
} from '../recurring-expense-repository'

export class PrismaRecurringExpenseRepository implements RecurringExpenseRepository {
  async create(data: CreateRecurringExpenseData): Promise<RecurringExpense> {
    return prisma.recurringExpense.create({
      data: {
        name: data.name,
        description: data.description,
        amount: data.amount,
        payment_method: data.paymentMethod,
        category: data.category,
        day_of_month: data.dayOfMonth,
        start_month: data.startMonth,
        start_year: data.startYear,
        end_month: data.endMonth ?? null,
        end_year: data.endYear ?? null,
        user_id: data.userId,
      },
    })
  }

  async findManyByUser(userId: string): Promise<RecurringExpense[]> {
    return prisma.recurringExpense.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    })
  }

  async findById(id: string): Promise<RecurringExpense | null> {
    return prisma.recurringExpense.findUnique({ where: { id } })
  }

  async update(data: UpdateRecurringExpenseData): Promise<RecurringExpense> {
    const updateData: Record<string, unknown> = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.amount !== undefined) updateData.amount = data.amount
    if (data.paymentMethod !== undefined) updateData.payment_method = data.paymentMethod
    if (data.category !== undefined) updateData.category = data.category
    if (data.dayOfMonth !== undefined) updateData.day_of_month = data.dayOfMonth
    if (data.startMonth !== undefined) updateData.start_month = data.startMonth
    if (data.startYear !== undefined) updateData.start_year = data.startYear
    if (data.endMonth !== undefined) updateData.end_month = data.endMonth
    if (data.endYear !== undefined) updateData.end_year = data.endYear

    return prisma.recurringExpense.update({
      where: { id: data.id },
      data: updateData,
    })
  }

  async delete(id: string): Promise<void> {
    await prisma.recurringExpense.delete({ where: { id } })
  }
}
