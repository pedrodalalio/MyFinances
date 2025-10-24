import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { FinancialDataRepository } from "../financial-data-repository"

export class PrismaFinancialDataRepository implements FinancialDataRepository {
  async findByUserAndPeriod(userId: string, month: string, year: number) {
    const financialData = await prisma.financialData.findUnique({
      where: {
        user_id_month_year: {
          user_id: userId,
          month,
          year
        }
      },
      include: {
        transactions: true,
        investments: true
      }
    })

    return financialData
  }

  async create(data: Prisma.FinancialDataUncheckedCreateInput) {
    const financialData = await prisma.financialData.create({
      data,
      include: {
        transactions: true,
        investments: true
      }
    })

    return financialData
  }

  async update(id: string, data: Prisma.FinancialDataUpdateInput) {
    const financialData = await prisma.financialData.update({
      where: { id },
      data,
      include: {
        transactions: true,
        investments: true
      }
    })

    return financialData
  }

  async findManyByUser(userId: string) {
    const financialData = await prisma.financialData.findMany({
      where: {
        user_id: userId
      },
      include: {
        transactions: true,
        investments: true
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ]
    })

    return financialData
  }

  async updateCreditCardSubtotal(id: string, creditCardSubtotal: number) {
    // Buscar dados atuais
    const currentData = await prisma.financialData.findUnique({
      where: { id }
    })

    if (!currentData) {
      throw new Error('FinancialData not found')
    }

    // Calcular novo total de gastos
    const newTotalExpenses = Number(currentData.expense_subtotal) + creditCardSubtotal + Number(currentData.tax_subtotal)

    // Atualizar subtotal de cartão e total de gastos
    const updatedFinancialData = await prisma.financialData.update({
      where: { id },
      data: {
        credit_card_subtotal: creditCardSubtotal,
        total_expenses: newTotalExpenses
      }
    })

    return updatedFinancialData
  }

  async delete(id: string) {
    await prisma.financialData.delete({
      where: { id }
    })
  }
}