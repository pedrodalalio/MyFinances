import { prisma } from '@/lib/prisma'
import { Investment } from '@prisma/client'
import { CreateInvestmentData, UpdateInvestmentData, InvestmentRepository } from '../investment-repository'

export class PrismaInvestmentRepository implements InvestmentRepository {
  async create(data: CreateInvestmentData): Promise<Investment> {
    const investment = await prisma.investment.create({
      data: {
        name: data.name,
        description: data.description,
        amount: data.amount,
        gross_yield: data.grossYield,
        investment_type: data.investmentType,
        category: data.category,
        month: data.month,
        year: data.year,
        date: data.date,
        purchase_date: data.purchaseDate,
        maturity_date: data.maturityDate,
        interest_rate: data.interestRate,
        quantity: data.quantity,
        broker: data.broker,
        status: data.status,
        notes: data.notes,
        user_id: data.userId
      }
    })

    return investment
  }

  async findByMonthAndUser(userId: string, month: string, year: number): Promise<Investment[]> {
    const investments = await prisma.investment.findMany({
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

  async findById(id: string): Promise<Investment | null> {
    const investment = await prisma.investment.findUnique({
      where: {
        id
      }
    })

    return investment
  }

  async update(data: UpdateInvestmentData): Promise<Investment> {
    const updateData: any = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.amount !== undefined) updateData.amount = data.amount
    if (data.grossYield !== undefined) updateData.gross_yield = data.grossYield
    if (data.investmentType !== undefined) updateData.investment_type = data.investmentType
    if (data.category !== undefined) updateData.category = data.category
    if (data.month !== undefined) updateData.month = data.month
    if (data.year !== undefined) updateData.year = data.year
    if (data.date !== undefined) updateData.date = data.date
    if (data.purchaseDate !== undefined) updateData.purchase_date = data.purchaseDate
    if (data.maturityDate !== undefined) updateData.maturity_date = data.maturityDate
    if (data.interestRate !== undefined) updateData.interest_rate = data.interestRate
    if (data.quantity !== undefined) updateData.quantity = data.quantity
    if (data.broker !== undefined) updateData.broker = data.broker
    if (data.status !== undefined) updateData.status = data.status
    if (data.notes !== undefined) updateData.notes = data.notes

    const investment = await prisma.investment.update({
      where: {
        id: data.id,
        user_id: data.userId
      },
      data: updateData
    })

    return investment
  }

  async delete(id: string, userId: string): Promise<void> {
    await prisma.investment.delete({
      where: {
        id,
        user_id: userId
      }
    })
  }

  async findAllPortfolioByUser(userId: string): Promise<Investment[]> {
    const investments = await prisma.investment.findMany({
      where: {
        user_id: userId
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    return investments
  }
}