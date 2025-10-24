import { prisma } from '@/lib/prisma'
import { MonthlyInvestment } from '@prisma/client'
import { CreateMonthlyInvestmentData, UpdateMonthlyInvestmentData, MonthlyInvestmentRepository } from '../monthly-investment-repository'

export class PrismaMonthlyInvestmentRepository implements MonthlyInvestmentRepository {
  async create(data: CreateMonthlyInvestmentData): Promise<MonthlyInvestment> {
    const investment = await prisma.monthlyInvestment.create({
      data: {
        name: data.name,
        description: data.description,
        amount: data.amount,
        investment_type: data.investmentType,
        category: data.category,
        month: data.month,
        year: data.year,
        date: data.date,
        user_id: data.userId
      }
    })

    return investment
  }

  async findByMonthAndUser(userId: string, month: string, year: number): Promise<MonthlyInvestment[]> {
    const investments = await prisma.monthlyInvestment.findMany({
      where: {
        user_id: userId,
        month,
        year
      },
      orderBy: {
        date: 'desc'
      }
    })

    return investments
  }

  async findById(id: string): Promise<MonthlyInvestment | null> {
    const investment = await prisma.monthlyInvestment.findUnique({
      where: {
        id
      }
    })

    return investment
  }

  async update(data: UpdateMonthlyInvestmentData): Promise<MonthlyInvestment> {
    const updateData: any = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.amount !== undefined) updateData.amount = data.amount
    if (data.investmentType !== undefined) updateData.investment_type = data.investmentType
    if (data.category !== undefined) updateData.category = data.category
    if (data.month !== undefined) updateData.month = data.month
    if (data.year !== undefined) updateData.year = data.year
    if (data.date !== undefined) updateData.date = data.date

    const investment = await prisma.monthlyInvestment.update({
      where: {
        id: data.id,
        user_id: data.userId
      },
      data: updateData
    })

    return investment
  }

  async delete(id: string, userId: string): Promise<void> {
    await prisma.monthlyInvestment.delete({
      where: {
        id,
        user_id: userId
      }
    })
  }
}