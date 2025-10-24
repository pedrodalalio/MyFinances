import { CreditCardPurchasesRepository } from "@/repositories/credit-card-purchases-repository"
import { ResourceNotFoundError } from "./errors/resource-not-found-error"

interface DeleteCreditCardPurchaseServiceRequest {
  purchaseId: string
  userId: string
}

export class DeleteCreditCardPurchaseService {
  constructor(
    private creditCardPurchasesRepository: CreditCardPurchasesRepository
  ) {}

  async execute({
    purchaseId,
    userId
  }: DeleteCreditCardPurchaseServiceRequest): Promise<void> {

    const purchase = await this.creditCardPurchasesRepository.findById(purchaseId)

    if (!purchase) {
      throw new ResourceNotFoundError()
    }

    if (purchase.user_id !== userId) {
      throw new ResourceNotFoundError()
    }

    await this.creditCardPurchasesRepository.delete(purchaseId)
  }
}