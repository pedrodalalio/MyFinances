import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { CreditCardInstallmentsRepository } from "../credit-card-installments-repository"

export class PrismaCreditCardInstallmentsRepository implements CreditCardInstallmentsRepository {
  async create(data: Prisma.CreditCardInstallmentCreateInput) {
    const creditCardInstallment = await prisma.creditCardInstallment.create({
      data
    })

    return creditCardInstallment
  }

  async findManyByPurchase(purchaseId: string) {
    const creditCardInstallments = await prisma.creditCardInstallment.findMany({
      where: {
        purchase_id: purchaseId
      },
      orderBy: {
        current_installment: 'asc'
      }
    })

    return creditCardInstallments
  }

  async findManyByPeriod(month: string, year: number) {
    const creditCardInstallments = await prisma.creditCardInstallment.findMany({
      where: {
        month,
        year
      },
      include: {
        creditCardPurchase: {
          include: {
            user: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    return creditCardInstallments
  }

  async findManyByUserAndPeriod(userId: string, month: string, year: number) {
    const creditCardInstallments = await prisma.creditCardInstallment.findMany({
      where: {
        month,
        year,
        creditCardPurchase: {
          user_id: userId
        }
      },
      include: {
        creditCardPurchase: true
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    return creditCardInstallments
  }

  async delete(id: string) {
    await prisma.creditCardInstallment.delete({
      where: { id }
    })
  }

  async findById(id: string) {
    const creditCardInstallment = await prisma.creditCardInstallment.findUnique({
      where: { id },
      include: {
        creditCardPurchase: true
      }
    })

    return creditCardInstallment
  }

  async update(id: string, installmentAmount: number) {
    const creditCardInstallment = await prisma.creditCardInstallment.update({
      where: { id },
      data: {
        installment_amount: installmentAmount
      }
    })

    return creditCardInstallment
  }

  async deleteByPurchaseId(purchaseId: string) {
    await prisma.creditCardInstallment.deleteMany({
      where: {
        purchase_id: purchaseId
      }
    })
  }
}