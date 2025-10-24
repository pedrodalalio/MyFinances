import { Tax } from '@prisma/client'
import { TaxRepository } from '@/repositories/tax-repository'

interface GetTaxesByMonthServiceRequest {
  userId: string
  month: string
  year: number
}

interface GetTaxesByMonthServiceResponse {
  taxes: Tax[]
}

export class GetTaxesByMonthService {
  constructor(private taxRepository: TaxRepository) {}

  async execute({
    userId,
    month,
    year
  }: GetTaxesByMonthServiceRequest): Promise<GetTaxesByMonthServiceResponse> {
    const taxes = await this.taxRepository.findByMonthAndUser(userId, month, year)

    return {
      taxes
    }
  }
}