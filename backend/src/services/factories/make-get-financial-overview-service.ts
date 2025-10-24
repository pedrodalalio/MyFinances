import { PrismaFinancialDataRepository } from "@/repositories/prisma/prisma-financial-data-repository"
import { PrismaSalaryProfilesRepository } from "@/repositories/prisma/prisma-salary-profiles-repository"
import { PrismaCreditCardInstallmentsRepository } from "@/repositories/prisma/prisma-credit-card-installments-repository"
import { PrismaCreditCardPurchasesRepository } from "@/repositories/prisma/prisma-credit-card-purchases-repository"
import { PrismaExpenseRepository } from "@/repositories/prisma/prisma-expense-repository"
import { PrismaMonthlyInvestmentRepository } from "@/repositories/prisma/prisma-monthly-investment-repository"
import { PrismaTaxRepository } from "@/repositories/prisma/prisma-tax-repository"
import { GetFinancialOverviewService } from "../get-financial-overview"
import { TransferBalanceToNextMonthService } from "../transfer-balance-to-next-month"

export function makeGetFinancialOverviewService() {
  const financialDataRepository = new PrismaFinancialDataRepository()
  const salaryProfilesRepository = new PrismaSalaryProfilesRepository()
  const creditCardInstallmentsRepository = new PrismaCreditCardInstallmentsRepository()
  const creditCardPurchasesRepository = new PrismaCreditCardPurchasesRepository()
  const expenseRepository = new PrismaExpenseRepository()
  const monthlyInvestmentRepository = new PrismaMonthlyInvestmentRepository()
  const taxRepository = new PrismaTaxRepository()

  const transferBalanceService = new TransferBalanceToNextMonthService(financialDataRepository)

  const service = new GetFinancialOverviewService(
    financialDataRepository,
    salaryProfilesRepository,
    creditCardInstallmentsRepository,
    creditCardPurchasesRepository,
    expenseRepository,
    monthlyInvestmentRepository,
    taxRepository,
    transferBalanceService
  )

  return service
}