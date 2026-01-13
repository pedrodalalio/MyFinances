import { CreditCardInstallmentsRepository } from "@/repositories/credit-card-installments-repository"
import { CreditCardPurchasesRepository } from "@/repositories/credit-card-purchases-repository"
import { ResourceNotFoundError } from "./errors/resource-not-found-error"

interface ListInstallmentsByPurchaseServiceRequest {
  purchaseId: string
  userId: string
}

interface ListInstallmentsByPurchaseServiceResponse {
  installments: {
    id: string
    purchase_id: string
    purchase_name: string
    installment_amount: number
    current_installment: number
    total_installments: number
    month: string
    year: number
    created_at: Date
  }[]
}

export class ListInstallmentsByPurchaseService {
  constructor(
    private creditCardInstallmentsRepository: CreditCardInstallmentsRepository,
    private creditCardPurchasesRepository: CreditCardPurchasesRepository
  ) {}

  async execute({
    purchaseId,
    userId
  }: ListInstallmentsByPurchaseServiceRequest): Promise<ListInstallmentsByPurchaseServiceResponse> {

    // Verify that the purchase belongs to the user
    const purchase = await this.creditCardPurchasesRepository.findById(purchaseId)

    if (!purchase) {
      throw new ResourceNotFoundError()
    }

    if (purchase.user_id !== userId) {
      throw new ResourceNotFoundError()
    }

    const installments = await this.creditCardInstallmentsRepository.findManyByPurchase(purchaseId)

    return {
      installments
    }
  }
}
