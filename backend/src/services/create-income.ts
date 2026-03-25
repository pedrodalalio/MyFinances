import { Income } from '@prisma/client'
import { IncomeRepository } from '@/repositories/income-repository'

interface CreateIncomeServiceRequest {
  userId: string
  name: string
  description?: string
  amount: number
  source?: string
  category?: string
  month: string
  year: number
  date: Date
}

interface CreateIncomeServiceResponse {
  income: Income
}

export class CreateIncomeService {
  constructor(private incomeRepository: IncomeRepository) {}

  async execute({
    userId,
    name,
    description,
    amount,
    source,
    category,
    month,
    year,
    date
  }: CreateIncomeServiceRequest): Promise<CreateIncomeServiceResponse> {
    const income = await this.incomeRepository.create({
      userId,
      name,
      description,
      amount,
      source,
      category,
      month,
      year,
      date
    })

    return {
      income
    }
  }
}
