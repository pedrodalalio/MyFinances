import { PrismaCreditCardPurchasesRepository } from "@/repositories/prisma/prisma-credit-card-purchases-repository"
import { PrismaCreditCardInstallmentsRepository } from "@/repositories/prisma/prisma-credit-card-installments-repository"
import { UpdateCreditCardPurchaseService } from "../update-credit-card-purchase"

export function makeUpdateCreditCardPurchaseService() {
  const creditCardPurchasesRepository = new PrismaCreditCardPurchasesRepository()
  const creditCardInstallmentsRepository = new PrismaCreditCardInstallmentsRepository()
  const updateCreditCardPurchaseService = new UpdateCreditCardPurchaseService(
    creditCardPurchasesRepository,
    creditCardInstallmentsRepository
  )

  return updateCreditCardPurchaseService
}