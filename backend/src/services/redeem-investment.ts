import { InvestmentRepository } from '@/repositories/investment-repository'
import { IncomeRepository } from '@/repositories/income-repository'
import { prisma } from '@/lib/prisma'
import { Investment } from '@prisma/client'

interface RedeemInvestmentRequest {
  investmentId: string
  userId: string
  finalValue: number
  redeemDate?: Date
}

interface RedeemInvestmentResponse {
  investment: Investment
}

export class RedeemInvestmentService {
  constructor(
    private investmentRepository: InvestmentRepository,
    private incomeRepository: IncomeRepository
  ) {}

  async execute({
    investmentId,
    userId,
    finalValue,
    redeemDate
  }: RedeemInvestmentRequest): Promise<RedeemInvestmentResponse> {
    const investment = await this.investmentRepository.findById(investmentId)

    if (!investment) {
      throw new Error('Investimento não encontrado')
    }

    if (investment.user_id !== userId) {
      throw new Error('Investimento não pertence ao usuário')
    }

    if (investment.status !== 'ACTIVE') {
      throw new Error('Investimento não está ativo')
    }

    const effectiveDate = redeemDate ?? investment.maturity_date ?? new Date()
    const month = String(effectiveDate.getUTCMonth() + 1).padStart(2, '0')
    const year = effectiveDate.getUTCFullYear()

    await prisma.investmentSnapshot.create({
      data: {
        investment_id: investmentId,
        gross_yield: finalValue,
        net_value: finalValue,
        recorded_at: effectiveDate,
      }
    })

    await this.incomeRepository.create({
      userId,
      name: `Resgate: ${investment.name}`,
      description: `Resgate do investimento ${investment.name}`,
      amount: finalValue,
      source: investment.broker ?? undefined,
      category: 'Resgate de Investimento',
      month,
      year,
      date: effectiveDate
    })

    const updated = await this.investmentRepository.update({
      id: investmentId,
      userId,
      status: 'MATURED',
      netValue: finalValue,
      grossYield: finalValue
    })

    return { investment: updated }
  }
}
