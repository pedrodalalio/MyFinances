import { PrismaCreditCardPurchasesRepository } from "@/repositories/prisma/prisma-credit-card-purchases-repository"
import { ListCreditCardPurchasesService } from "../list-credit-card-purchases"

export function makeListCreditCardPurchasesService() {
  const creditCardPurchasesRepository = new PrismaCreditCardPurchasesRepository()
  const service = new ListCreditCardPurchasesService(creditCardPurchasesRepository)

  return service
}