import { PrismaFinancialDataRepository } from "@/repositories/prisma/prisma-financial-data-repository"
import { PrismaSalaryProfilesRepository } from "@/repositories/prisma/prisma-salary-profiles-repository"
import { PrismaCreditCardInstallmentsRepository } from "@/repositories/prisma/prisma-credit-card-installments-repository"
import { PrismaCreditCardPurchasesRepository } from "@/repositories/prisma/prisma-credit-card-purchases-repository"
import { PrismaExpenseRepository } from "@/repositories/prisma/prisma-expense-repository"
import { PrismaIncomeRepository } from "@/repositories/prisma/prisma-income-repository"
import { PrismaInvestmentRepository } from "@/repositories/prisma/prisma-investment-repository"
import { PrismaTaxRepository } from "@/repositories/prisma/prisma-tax-repository"
import { MonthSummaryService } from "../month-summary"

export function makeMonthSummaryService() {
  return new MonthSummaryService(
    new PrismaFinancialDataRepository(),
    new PrismaSalaryProfilesRepository(),
    new PrismaCreditCardInstallmentsRepository(),
    new PrismaCreditCardPurchasesRepository(),
    new PrismaExpenseRepository(),
    new PrismaIncomeRepository(),
    new PrismaInvestmentRepository(),
    new PrismaTaxRepository(),
  )
}
