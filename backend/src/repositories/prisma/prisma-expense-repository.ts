import { prisma } from '@/lib/prisma'
import { Expense, Prisma } from '@prisma/client'
import { CreateExpenseData, UpdateExpenseData, ExpenseRepository, ExpenseWithRecurring } from '../expense-repository'
import { isRecurringActive, toVirtualExpense } from '@/services/utils/recurring-expense'

export class PrismaExpenseRepository implements ExpenseRepository {
  async create(data: CreateExpenseData): Promise<Expense> {
    const expense = await prisma.expense.create({
      data: {
        name: data.name,
        description: data.description,
        amount: data.amount,
        payment_method: data.paymentMethod,
        category: data.category,
        month: data.month,
        year: data.year,
        date: data.date,
        user_id: data.userId
      }
    })

    return expense
  }

  async findByMonthAndUser(userId: string, month: string, year: number): Promise<ExpenseWithRecurring[]> {
    const expenses = await prisma.expense.findMany({
      where: {
        user_id: userId,
        month,
        year
      },
      orderBy: {
        date: 'desc'
      }
    })

    // Gastos fixos (recorrentes) são guardados como templates e expandidos em
    // linhas virtuais para o mês pedido. Como findByMonthAndUser é o único ponto
    // por onde passam todas as somas de gastos, isso os inclui em todos os
    // totais do sistema automaticamente.
    const recurring = await prisma.recurringExpense.findMany({
      where: { user_id: userId }
    })

    const virtualRecurring = recurring
      .filter((r) => isRecurringActive(r, month, year))
      .map((r) => toVirtualExpense(r, month, year))

    return [...virtualRecurring, ...expenses]
  }

  async findById(id: string): Promise<Expense | null> {
    const expense = await prisma.expense.findUnique({
      where: {
        id
      }
    })

    return expense
  }

  async update(data: UpdateExpenseData): Promise<Expense> {
    const updateData: Prisma.ExpenseUncheckedUpdateInput = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.amount !== undefined) updateData.amount = data.amount
    if (data.paymentMethod !== undefined) updateData.payment_method = data.paymentMethod
    if (data.category !== undefined) updateData.category = data.category
    if (data.month !== undefined) updateData.month = data.month
    if (data.year !== undefined) updateData.year = data.year
    if (data.date !== undefined) updateData.date = data.date

    const expense = await prisma.expense.update({
      where: {
        id: data.id,
        user_id: data.userId
      },
      data: updateData
    })

    return expense
  }

  async delete(id: string, userId: string): Promise<void> {
    await prisma.expense.delete({
      where: {
        id,
        user_id: userId
      }
    })
  }
}