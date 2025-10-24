import { CreditCardPurchasesRepository } from "@/repositories/credit-card-purchases-repository"
import { CreditCardInstallmentsRepository } from "@/repositories/credit-card-installments-repository"
import { ResourceNotFoundError } from "./errors/resource-not-found-error"

interface UpdateCreditCardPurchaseServiceRequest {
  id: string
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

interface UpdateCreditCardPurchaseServiceResponse {
  purchase: {
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
    user_id: string
    created_at: Date
    updated_at: Date
  }
}

export class UpdateCreditCardPurchaseService {
  constructor(
    private creditCardPurchasesRepository: CreditCardPurchasesRepository,
    private creditCardInstallmentsRepository: CreditCardInstallmentsRepository
  ) {}

  async execute({
    id,
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
  }: UpdateCreditCardPurchaseServiceRequest): Promise<UpdateCreditCardPurchaseServiceResponse> {

    const existingPurchase = await this.creditCardPurchasesRepository.findById(id)

    if (!existingPurchase) {
      throw new ResourceNotFoundError()
    }

    if (existingPurchase.user_id !== userId) {
      throw new ResourceNotFoundError()
    }

    const purchase = await this.creditCardPurchasesRepository.update(id, {
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
    })

    // Se mudou de parcelado para recorrente ou vice-versa, recriar as parcelas
    const wasRecurring = existingPurchase.is_recurring
    const isNowRecurring = is_recurring

    if (wasRecurring !== isNowRecurring || (!isNowRecurring && installments !== existingPurchase.installments)) {
      // Deletar parcelas existentes
      await this.creditCardInstallmentsRepository.deleteByPurchaseId(id)

      // Criar novas parcelas apenas se não for recorrente
      if (!is_recurring && installments) {
        let currentMonth = parseInt(start_month)
        let currentYear = start_year

        for (let i = 1; i <= installments; i++) {
          await this.creditCardInstallmentsRepository.create({
            purchase_id: purchase.id,
            purchase_name: name,
            installment_amount,
            current_installment: i,
            total_installments: installments,
            month: currentMonth.toString().padStart(2, '0'),
            year: currentYear
          })

          // Avançar para o próximo mês
          currentMonth++
          if (currentMonth > 12) {
            currentMonth = 1
            currentYear++
          }
        }
      }
    }

    return {
      purchase
    }
  }
}