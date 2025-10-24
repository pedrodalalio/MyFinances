import { Tax, TaxType, PaymentMethod, TaxFrequency } from '@prisma/client'
import { TaxRepository } from '@/repositories/tax-repository'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

interface UpdateTaxServiceRequest {
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

interface UpdateTaxServiceResponse {
  tax: Tax
}

export class UpdateTaxService {
  constructor(private taxRepository: TaxRepository) {}

  async execute({
    id,
    userId,
    taxType,
    amount,
    paymentMethod,
    frequency,
    dayOfMonth,
    month,
    year,
    dueDate
  }: UpdateTaxServiceRequest): Promise<UpdateTaxServiceResponse> {
    const existingTax = await this.taxRepository.findById(id)

    if (!existingTax) {
      throw new ResourceNotFoundError()
    }

    const tax = await this.taxRepository.update({
      id,
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