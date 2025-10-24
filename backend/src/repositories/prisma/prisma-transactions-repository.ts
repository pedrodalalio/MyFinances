import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { TransactionsRepository } from "../transactions-repository"

export class PrismaTransactionsRepository implements TransactionsRepository {
  async create(data: Prisma.TransactionCreateInput) {
    const transaction = await prisma.transaction.create({
      data
    })

    return transaction
  }

  async findManyByFinancialData(financialDataId: string) {
    const transactions = await prisma.transaction.findMany({
      where: {
        financial_data_id: financialDataId
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    return transactions
  }

  async update(id: string, data: Prisma.TransactionUpdateInput) {
    const transaction = await prisma.transaction.update({
      where: { id },
      data
    })

    return transaction
  }

  async delete(id: string) {
    await prisma.transaction.delete({
      where: { id }
    })
  }

  async findById(id: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id }
    })

    return transaction
  }
}