import { PrismaCreditCardInstallmentsRepository } from "@/repositories/prisma/prisma-credit-card-installments-repository"
import { PrismaCreditCardPurchasesRepository } from "@/repositories/prisma/prisma-credit-card-purchases-repository"
import { PrismaSalaryProfilesRepository } from "@/repositories/prisma/prisma-salary-profiles-repository"
import { GetMonthlyExpensesService } from "../get-monthly-expenses"

export function makeGetMonthlyExpensesService() {
  const creditCardInstallmentsRepository = new PrismaCreditCardInstallmentsRepository()
  const creditCardPurchasesRepository = new PrismaCreditCardPurchasesRepository()
  const salaryProfilesRepository = new PrismaSalaryProfilesRepository()
  const getMonthlyExpensesService = new GetMonthlyExpensesService(
    creditCardInstallmentsRepository,
    creditCardPurchasesRepository,
    salaryProfilesRepository
  )

  return getMonthlyExpensesService
}