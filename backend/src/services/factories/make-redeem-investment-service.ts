import { PrismaInvestmentRepository } from '@/repositories/prisma/prisma-investment-repository'
import { PrismaIncomeRepository } from '@/repositories/prisma/prisma-income-repository'
import { RedeemInvestmentService } from '../redeem-investment'

export function makeRedeemInvestmentService() {
  const investmentRepository = new PrismaInvestmentRepository()
  const incomeRepository = new PrismaIncomeRepository()
  return new RedeemInvestmentService(investmentRepository, incomeRepository)
}
