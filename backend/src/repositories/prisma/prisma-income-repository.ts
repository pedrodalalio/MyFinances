import { prisma } from '@/lib/prisma'
import { Income } from '@prisma/client'
import { CreateIncomeData, UpdateIncomeData, IncomeRepository } from '../income-repository'

export class PrismaIncomeRepository implements IncomeRepository {
  async create(data: CreateIncomeData): Promise<Income> {
    const income = await prisma.income.create({
      data: {
        name: data.name,
        description: data.description,
        amount: data.amount,
        source: data.source,
        category: data.category,
        month: data.month,
        year: data.year,
        date: data.date,
        user_id: data.userId
      }
    })

    return income
  }

  async findByMonthAndUser(userId: string, month: string, year: number): Promise<Income[]> {
    const incomes = await prisma.income.findMany({
      where: {
        user_id: userId,
        month,
        year
      },
      orderBy: {
        date: 'desc'
      }
    })

    return incomes
  }

  async findById(id: string): Promise<Income | null> {
    const income = await prisma.income.findUnique({
      where: {
        id
      }
    })

    return income
  }

  async update(data: UpdateIncomeData): Promise<Income> {
    const updateData: any = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.amount !== undefined) updateData.amount = data.amount
    if (data.source !== undefined) updateData.source = data.source
    if (data.category !== undefined) updateData.category = data.category
    if (data.month !== undefined) updateData.month = data.month
    if (data.year !== undefined) updateData.year = data.year
    if (data.date !== undefined) updateData.date = data.date

    const income = await prisma.income.update({
      where: {
        id: data.id,
        user_id: data.userId
      },
      data: updateData
    })

    return income
  }

  async delete(id: string, userId: string): Promise<void> {
    await prisma.income.delete({
      where: {
        id,
        user_id: userId
      }
    })
  }
}
