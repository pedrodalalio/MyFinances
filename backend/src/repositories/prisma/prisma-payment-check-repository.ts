import { prisma } from '@/lib/prisma'
import { PaymentCheck } from '@prisma/client'
import { PaymentCheckRepository, SetPaymentCheckData } from '../payment-check-repository'

export class PrismaPaymentCheckRepository implements PaymentCheckRepository {
  async findByMonthAndUser(userId: string, month: string, year: number): Promise<PaymentCheck[]> {
    const checks = await prisma.paymentCheck.findMany({
      where: {
        user_id: userId,
        month,
        year
      }
    })

    return checks
  }

  async set(data: SetPaymentCheckData): Promise<void> {
    if (data.paid) {
      await prisma.paymentCheck.upsert({
        where: {
          user_id_item_key_month_year: {
            user_id: data.userId,
            item_key: data.itemKey,
            month: data.month,
            year: data.year
          }
        },
        create: {
          user_id: data.userId,
          item_key: data.itemKey,
          month: data.month,
          year: data.year
        },
        update: {}
      })
    } else {
      await prisma.paymentCheck.deleteMany({
        where: {
          user_id: data.userId,
          item_key: data.itemKey,
          month: data.month,
          year: data.year
        }
      })
    }
  }
}
