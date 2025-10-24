import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { InvestmentsRepository } from "../investments-repository"

export class PrismaInvestmentsRepository implements InvestmentsRepository {
  async create(data: Prisma.InvestmentCreateInput) {
    const investment = await prisma.investment.create({
      data
    })

    return investment
  }

  async findManyByFinancialData(financialDataId: string) {
    const investments = await prisma.investment.findMany({
      where: {
        financial_data_id: financialDataId
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    return investments
  }

  async update(id: string, data: Prisma.InvestmentUpdateInput) {
    const investment = await prisma.investment.update({
      where: { id },
      data
    })

    return investment
  }

  async delete(id: string) {
    await prisma.investment.delete({
      where: { id }
    })
  }

  async findById(id: string) {
    const investment = await prisma.investment.findUnique({
      where: { id }
    })

    return investment
  }
}