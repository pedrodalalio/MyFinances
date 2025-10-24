import { PrismaCreditCardPurchasesRepository } from "@/repositories/prisma/prisma-credit-card-purchases-repository"
import { PrismaCreditCardInstallmentsRepository } from "@/repositories/prisma/prisma-credit-card-installments-repository"
import { CreateCreditCardPurchaseService } from "../create-credit-card-purchase"

export function makeCreateCreditCardPurchaseService() {
  const creditCardPurchasesRepository = new PrismaCreditCardPurchasesRepository()
  const creditCardInstallmentsRepository = new PrismaCreditCardInstallmentsRepository()
  const service = new CreateCreditCardPurchaseService(creditCardPurchasesRepository, creditCardInstallmentsRepository)

  return service
}