import { Tax, TaxType, PaymentMethod, TaxFrequency } from '@prisma/client'
import { TaxRepository } from '@/repositories/tax-repository'

interface CreateTaxServiceRequest {
  userId: string
  taxType: TaxType
  amount: number
  paymentMethod: PaymentMethod
  frequency: TaxFrequency
  dayOfMonth: number
  month: string
  year: number
  dueDate: Date
}

interface CreateTaxServiceResponse {
  tax: Tax
}

export class CreateTaxService {
  constructor(private taxRepository: TaxRepository) {}

  async execute({
    userId,
    taxType,
    amount,
    paymentMethod,
    frequency,
    dayOfMonth,
    month,
    year,
    dueDate
  }: CreateTaxServiceRequest): Promise<CreateTaxServiceResponse> {
    const tax = await this.taxRepository.create({
      userId,
      taxType,
      amount,
      paymentMethod,
      frequency,
      dayOfMonth,
      month,
      year,
      dueDate
    })

    return {
      tax
    }
  }
}