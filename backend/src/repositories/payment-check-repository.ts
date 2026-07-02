import { PaymentCheck } from '@prisma/client'

export interface SetPaymentCheckData {
  userId: string
  itemKey: string
  month: string
  year: number
  paid: boolean
}

export interface PaymentCheckRepository {
  findByMonthAndUser(userId: string, month: string, year: number): Promise<PaymentCheck[]>
  set(data: SetPaymentCheckData): Promise<void>
}
