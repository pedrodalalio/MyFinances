import { IncomeRepository } from '@/repositories/income-repository'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

interface DeleteIncomeServiceRequest {
  id: string
  userId: string
}

export class DeleteIncomeService {
  constructor(private incomeRepository: IncomeRepository) {}

  async execute({ id, userId }: DeleteIncomeServiceRequest): Promise<void> {
    const existingIncome = await this.incomeRepository.findById(id)

    if (!existingIncome || existingIncome.user_id !== userId) {
      throw new ResourceNotFoundError()
    }

    await this.incomeRepository.delete(id, userId)
  }
}
