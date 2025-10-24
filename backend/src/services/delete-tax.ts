import { TaxRepository } from '@/repositories/tax-repository'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

interface DeleteTaxServiceRequest {
  id: string
  userId: string
}

export class DeleteTaxService {
  constructor(private taxRepository: TaxRepository) {}

  async execute({
    id,
    userId
  }: DeleteTaxServiceRequest): Promise<void> {
    const existingTax = await this.taxRepository.findById(id)

    if (!existingTax) {
      throw new ResourceNotFoundError()
    }

    await this.taxRepository.delete(id, userId)
  }
}