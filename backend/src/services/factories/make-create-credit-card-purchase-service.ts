import { PrismaCreditCardPurchasesRepository } from "@/repositories/prisma/prisma-credit-card-purchases-repository"
import { CreateCreditCardPurchaseService } from "../create-credit-card-purchase"

export function makeCreateCreditCardPurchaseService() {
  const creditCardPurchasesRepository = new PrismaCreditCardPurchasesRepository()
  const service = new CreateCreditCardPurchaseService(creditCardPurchasesRepository)

  return service
}