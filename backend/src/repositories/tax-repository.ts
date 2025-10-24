import { Tax, TaxType, PaymentMethod, TaxFrequency } from '@prisma/client'

export interface CreateTaxData {
  taxType: TaxType
  amount: number
  paymentMethod: PaymentMethod
  frequency: TaxFrequency
  dayOfMonth: number
  month: string
  year: number
  dueDate: Date
  userId: string
}

export interface UpdateTaxData {
  id: string
  userId: string
  taxType?: TaxType
  amount?: number
  paymentMethod?: PaymentMethod
  frequency?: TaxFrequency
  dayOfMonth?: number
  month?: string
  year?: number
  dueDate?: Date
}

export interface TaxRepository {
  create(data: CreateTaxData): Promise<Tax>
  findByMonthAndUser(userId: string, month: string, year: number): Promise<Tax[]>
  findById(id: string): Promise<Tax | null>
  update(data: UpdateTaxData): Promise<Tax>
  delete(id: string, userId: string): Promise<void>
}