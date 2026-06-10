import { prisma } from '@/lib/prisma'
import { Investment, Prisma } from '@prisma/client'
import { CreateInvestmentData, UpdateInvestmentData, InvestmentRepository } from '../investment-repository'

export class PrismaInvestmentRepository implements InvestmentRepository {
  async create(data: CreateInvestmentData): Promise<Investment> {
    const investment = await prisma.investment.create({
      data: {
        name: data.name,
        description: data.description,
        amount: data.amount,
        net_value: data.netValue,
        gross_yield: data.grossYield,
        investment_type: data.investmentType,
        category: data.category,
        date: data.date,
        purchase_date: data.purchaseDate,
        maturity_date: data.maturityDate,
        interest_rate: data.interestRate,
        quantity: data.quantity,
        broker: data.broker,
        ticker: data.ticker,
        dividend_yield: data.dividendYield,
        status: data.status,
        notes: data.notes,
        user_id: data.userId
      }
    })

    return investment
  }

  async findByMonthAndUser(userId: string, month: string, year: number): Promise<Investment[]> {
    const monthInt = parseInt(month)
    const startDate = new Date(Date.UTC(year, monthInt - 1, 1))
    const endDate = new Date(Date.UTC(year, monthInt, 1))

    const investments = await prisma.investment.findMany({
      where: {
        user_id: userId,
        purchase_date: {
          gte: startDate,
          lt: endDate
        }
      },
      orderBy: {
        purchase_date: 'desc'
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
    const updateData: Prisma.InvestmentUncheckedUpdateInput = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.amount !== undefined) updateData.amount = data.amount
    if (data.netValue !== undefined) updateData.net_value = data.netValue
    if (data.grossYield !== undefined) updateData.gross_yield = data.grossYield
    if (data.investmentType !== undefined) updateData.investment_type = data.investmentType
    if (data.category !== undefined) updateData.category = data.category
    if (data.date !== undefined) updateData.date = data.date
    if (data.purchaseDate !== undefined) updateData.purchase_date = data.purchaseDate
    if (data.maturityDate !== undefined) updateData.maturity_date = data.maturityDate
    if (data.interestRate !== undefined) updateData.interest_rate = data.interestRate
    if (data.quantity !== undefined) updateData.quantity = data.quantity
    if (data.broker !== undefined) updateData.broker = data.broker
    if (data.ticker !== undefined) updateData.ticker = data.ticker
    if (data.dividendYield !== undefined) updateData.dividend_yield = data.dividendYield
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

  async findMaturedPendingByUser(userId: string, referenceDate: Date): Promise<Investment[]> {
    const investments = await prisma.investment.findMany({
      where: {
        user_id: userId,
        status: 'ACTIVE',
        maturity_date: {
          not: null,
          lte: referenceDate
        }
      },
      orderBy: {
        maturity_date: 'asc'
      }
    })

    return investments
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