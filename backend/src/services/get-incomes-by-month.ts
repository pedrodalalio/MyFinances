import { Income } from '@prisma/client'
import { IncomeRepository } from '@/repositories/income-repository'

interface GetIncomesByMonthServiceRequest {
  userId: string
  month: string
  year: number
}

interface GetIncomesByMonthServiceResponse {
  incomes: Income[]
}

export class GetIncomesByMonthService {
  constructor(private incomeRepository: IncomeRepository) {}

  async execute({
    userId,
    month,
    year
  }: GetIncomesByMonthServiceRequest): Promise<GetIncomesByMonthServiceResponse> {
    const incomes = await this.incomeRepository.findByMonthAndUser(userId, month, year)

    return {
      incomes
    }
  }
}
