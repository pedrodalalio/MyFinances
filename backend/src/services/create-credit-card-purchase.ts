import { CreditCardPurchase, CreditCardInstallment } from "@prisma/client"
import {
  CreditCardPurchasesRepository,
  InstallmentRowForPurchase,
} from "@/repositories/credit-card-purchases-repository"
import { nextPeriod } from "./utils/period"

interface CreateCreditCardPurchaseServiceRequest {
  name: string
  description?: string
  total_amount: number
  installments?: number
  installment_amount: number
  start_month: string
  start_year: number
  end_month?: string
  end_year?: number
  category?: string
  is_recurring?: boolean
  userId: string
}

interface CreateCreditCardPurchaseServiceResponse {
  purchase: CreditCardPurchase & { installments_data: CreditCardInstallment[] }
}

export class CreateCreditCardPurchaseService {
  constructor(
    private creditCardPurchasesRepository: CreditCardPurchasesRepository
  ) {}

  async execute({
    name,
    description,
    total_amount,
    installments,
    installment_amount,
    start_month,
    start_year,
    end_month,
    end_year,
    category,
    is_recurring = false,
    userId
  }: CreateCreditCardPurchaseServiceRequest): Promise<CreateCreditCardPurchaseServiceResponse> {

    // Parcelas individuais existem apenas quando não é recorrente
    const installmentRows: InstallmentRowForPurchase[] = []

    if (!is_recurring && installments) {
      let current = { month: start_month, year: start_year }

      for (let i = 1; i <= installments; i++) {
        installmentRows.push({
          purchase_name: name,
          installment_amount,
          current_installment: i,
          total_installments: installments,
          month: current.month,
          year: current.year
        })

        current = nextPeriod(current)
      }
    }

    // Compra + parcelas em uma única transação
    const purchase = await this.creditCardPurchasesRepository.createWithInstallments(
      {
        name,
        description,
        total_amount,
        installments,
        installment_amount,
        start_month,
        start_year,
        end_month,
        end_year,
        category,
        is_recurring,
        user_id: userId
      },
      installmentRows
    )

    return {
      purchase
    }
  }
}