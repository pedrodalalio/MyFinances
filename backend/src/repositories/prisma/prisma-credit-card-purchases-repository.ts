import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import {
  CreditCardPurchasesRepository,
  InstallmentRowForPurchase,
} from "../credit-card-purchases-repository"

export class PrismaCreditCardPurchasesRepository implements CreditCardPurchasesRepository {
  async create(data: Prisma.CreditCardPurchaseCreateInput) {
    const creditCardPurchase = await prisma.creditCardPurchase.create({
      data,
      include: {
        installments_data: true
      }
    })

    return creditCardPurchase
  }

  async createWithInstallments(
    data: Prisma.CreditCardPurchaseUncheckedCreateInput,
    installments: InstallmentRowForPurchase[],
  ) {
    return prisma.$transaction(async (tx) => {
      const purchase = await tx.creditCardPurchase.create({ data })

      if (installments.length > 0) {
        await tx.creditCardInstallment.createMany({
          data: installments.map((installment) => ({
            ...installment,
            purchase_id: purchase.id,
          })),
        })
      }

      return tx.creditCardPurchase.findUniqueOrThrow({
        where: { id: purchase.id },
        include: { installments_data: true },
      })
    })
  }

  async findManyByUser(userId: string) {
    const creditCardPurchases = await prisma.creditCardPurchase.findMany({
      where: {
        user_id: userId
      },
      include: {
        installments_data: true
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    return creditCardPurchases
  }

  async findById(id: string) {
    const creditCardPurchase = await prisma.creditCardPurchase.findUnique({
      where: { id },
      include: {
        installments_data: true
      }
    })

    return creditCardPurchase
  }

  async update(id: string, data: Prisma.CreditCardPurchaseUpdateInput) {
    const creditCardPurchase = await prisma.creditCardPurchase.update({
      where: { id },
      data,
      include: {
        installments_data: true
      }
    })

    return creditCardPurchase
  }

  async delete(id: string) {
    await prisma.creditCardPurchase.delete({
      where: { id }
    })
  }
}