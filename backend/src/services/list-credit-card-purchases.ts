import { CreditCardPurchasesRepository } from "@/repositories/credit-card-purchases-repository"

interface ListCreditCardPurchasesServiceRequest {
  userId: string
}

interface ListCreditCardPurchasesServiceResponse {
  purchases: {
    id: string
    name: string
    description: string | null
    total_amount: number
    installments: number | null
    installment_amount: number
    start_month: string
    start_year: number
    end_month: string | null
    end_year: number | null
    category: string | null
    is_recurring: boolean
    created_at: Date
    updated_at: Date
  }[]
}

export class ListCreditCardPurchasesService {
  constructor(
    private creditCardPurchasesRepository: CreditCardPurchasesRepository
  ) {}

  async execute({
    userId
  }: ListCreditCardPurchasesServiceRequest): Promise<ListCreditCardPurchasesServiceResponse> {

    const purchases = await this.creditCardPurchasesRepository.findManyByUser(userId)

    return {
      purchases
    }
  }
}