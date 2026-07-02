import { PrismaInvestmentRepository } from '@/repositories/prisma/prisma-investment-repository'
import { GetFiiIncomeForecastService } from '../get-fii-income-forecast'

export function makeGetFiiIncomeForecastService() {
  const investmentRepository = new PrismaInvestmentRepository()
  return new GetFiiIncomeForecastService(investmentRepository)
}
