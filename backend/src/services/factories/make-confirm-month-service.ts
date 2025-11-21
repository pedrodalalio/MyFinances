import { PrismaFinancialDataRepository } from "@/repositories/prisma/prisma-financial-data-repository"
import { PrismaSalaryProfilesRepository } from "@/repositories/prisma/prisma-salary-profiles-repository"
import { PrismaCreditCardInstallmentsRepository } from "@/repositories/prisma/prisma-credit-card-installments-repository"
import { PrismaCreditCardPurchasesRepository } from "@/repositories/prisma/prisma-credit-card-purchases-repository"
import { PrismaExpenseRepository } from "@/repositories/prisma/prisma-expense-repository"
import { PrismaInvestmentRepository } from "@/repositories/prisma/prisma-investment-repository"
import { PrismaTaxRepository } from "@/repositories/prisma/prisma-tax-repository"
import { ConfirmMonthService } from "../confirm-month"

export function makeConfirmMonthService() {
  const financialDataRepository = new PrismaFinancialDataRepository()
  const salaryProfilesRepository = new PrismaSalaryProfilesRepository()
  const creditCardInstallmentsRepository = new PrismaCreditCardInstallmentsRepository()
  const creditCardPurchasesRepository = new PrismaCreditCardPurchasesRepository()
  const expenseRepository = new PrismaExpenseRepository()
  const investmentRepository = new PrismaInvestmentRepository()
  const taxRepository = new PrismaTaxRepository()

  const service = new ConfirmMonthService(
    financialDataRepository,
    salaryProfilesRepository,
    creditCardInstallmentsRepository,
    creditCardPurchasesRepository,
    expenseRepository,
    investmentRepository,
    taxRepository
  )

  return service
}