import { InvestmentRepository } from '@/repositories/investment-repository'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

interface DeleteInvestmentServiceRequest {
  investmentId: string
  userId: string
}

export class DeleteInvestmentService {
  constructor(
    private investmentRepository: InvestmentRepository
  ) {}

  async execute({
    investmentId,
    userId
  }: DeleteInvestmentServiceRequest): Promise<void> {
    const investmentExists = await this.investmentRepository.findById(investmentId)

    if (!investmentExists) {
      throw new ResourceNotFoundError()
    }

    await this.investmentRepository.delete(investmentId, userId)
  }
}