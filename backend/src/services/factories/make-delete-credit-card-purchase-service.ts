import { PrismaCreditCardPurchasesRepository } from "@/repositories/prisma/prisma-credit-card-purchases-repository"
import { DeleteCreditCardPurchaseService } from "../delete-credit-card-purchase"

export function makeDeleteCreditCardPurchaseService() {
  const creditCardPurchasesRepository = new PrismaCreditCardPurchasesRepository()
  const service = new DeleteCreditCardPurchaseService(creditCardPurchasesRepository)

  return service
}