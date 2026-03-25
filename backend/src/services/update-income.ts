import { Income } from '@prisma/client'
import { IncomeRepository } from '@/repositories/income-repository'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

interface UpdateIncomeServiceRequest {
  id: string
  userId: string
  name?: string
  description?: string
  amount?: number
  source?: string
  category?: string
  month?: string
  year?: number
  date?: Date
}

interface UpdateIncomeServiceResponse {
  income: Income
}

export class UpdateIncomeService {
  constructor(private incomeRepository: IncomeRepository) {}

  async execute(data: UpdateIncomeServiceRequest): Promise<UpdateIncomeServiceResponse> {
    const existingIncome = await this.incomeRepository.findById(data.id)

    if (!existingIncome || existingIncome.user_id !== data.userId) {
      throw new ResourceNotFoundError()
    }

    const income = await this.incomeRepository.update(data)

    return {
      income
    }
  }
}
