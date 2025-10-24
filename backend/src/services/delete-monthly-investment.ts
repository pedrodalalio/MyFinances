import { MonthlyInvestmentRepository } from '@/repositories/monthly-investment-repository'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

interface DeleteMonthlyInvestmentServiceRequest {
  investmentId: string
  userId: string
}

export class DeleteMonthlyInvestmentService {
  constructor(
    private monthlyInvestmentRepository: MonthlyInvestmentRepository
  ) {}

  async execute({
    investmentId,
    userId
  }: DeleteMonthlyInvestmentServiceRequest): Promise<void> {
    const investmentExists = await this.monthlyInvestmentRepository.findById(investmentId)

    if (!investmentExists) {
      throw new ResourceNotFoundError()
    }

    await this.monthlyInvestmentRepository.delete(investmentId, userId)
  }
}