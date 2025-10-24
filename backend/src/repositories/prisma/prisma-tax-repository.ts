import { prisma } from '@/lib/prisma'
import { Tax } from '@prisma/client'
import { CreateTaxData, UpdateTaxData, TaxRepository } from '../tax-repository'

export class PrismaTaxRepository implements TaxRepository {
  async create(data: CreateTaxData): Promise<Tax> {
    const tax = await prisma.tax.create({
      data: {
        tax_type: data.taxType,
        amount: data.amount,
        payment_method: data.paymentMethod,
        frequency: data.frequency,
        day_of_month: data.dayOfMonth,
        month: data.month,
        year: data.year,
        due_date: data.dueDate,
        user_id: data.userId
      }
    })

    return tax
  }

  async findByMonthAndUser(userId: string, month: string, year: number): Promise<Tax[]> {
    const taxes = await prisma.tax.findMany({
      where: {
        user_id: userId,
        month,
        year
      },
      orderBy: {
        due_date: 'asc'
      }
    })

    return taxes
  }

  async findById(id: string): Promise<Tax | null> {
    const tax = await prisma.tax.findUnique({
      where: {
        id
      }
    })

    return tax
  }

  async update(data: UpdateTaxData): Promise<Tax> {
    const updateData: any = {}

    if (data.taxType !== undefined) updateData.tax_type = data.taxType
    if (data.amount !== undefined) updateData.amount = data.amount
    if (data.paymentMethod !== undefined) updateData.payment_method = data.paymentMethod
    if (data.frequency !== undefined) updateData.frequency = data.frequency
    if (data.dayOfMonth !== undefined) updateData.day_of_month = data.dayOfMonth
    if (data.month !== undefined) updateData.month = data.month
    if (data.year !== undefined) updateData.year = data.year
    if (data.dueDate !== undefined) updateData.due_date = data.dueDate

    const tax = await prisma.tax.update({
      where: {
        id: data.id,
        user_id: data.userId
      },
      data: updateData
    })

    return tax
  }

  async delete(id: string, userId: string): Promise<void> {
    await prisma.tax.delete({
      where: {
        id,
        user_id: userId
      }
    })
  }
}