import { CreditCardInstallment } from '@prisma/client'
import { CreditCardInstallmentsRepository } from '@/repositories/credit-card-installments-repository'
import { UpdateFinancialDataCreditCardSubtotalService } from './update-financial-data-credit-card-subtotal'
import { ResourceNotFoundError } from './errors/resource-not-found-error'

interface UpdateInstallmentServiceRequest {
  installmentId: string
  userId: string
  installmentAmount: number
}

interface UpdateInstallmentServiceResponse {
  installment: CreditCardInstallment
}

export class UpdateInstallmentService {
  constructor(
    private creditCardInstallmentsRepository: CreditCardInstallmentsRepository,
    private updateFinancialDataCreditCardSubtotalService: UpdateFinancialDataCreditCardSubtotalService
  ) {}

  async execute({
    installmentId,
    userId,
    installmentAmount
  }: UpdateInstallmentServiceRequest): Promise<UpdateInstallmentServiceResponse> {
    const installment = await this.creditCardInstallmentsRepository.findById(installmentId)

    if (!installment) {
      throw new ResourceNotFoundError()
    }

    // Verificar se a parcela pertence ao usuário
    if (!installment.creditCardPurchase || installment.creditCardPurchase.user_id !== userId) {
      throw new ResourceNotFoundError()
    }

    const updatedInstallment = await this.creditCardInstallmentsRepository.update(
      installmentId,
      installmentAmount
    )

    // Recalcular totais de cartão de crédito para o mês da parcela
    await this.updateFinancialDataCreditCardSubtotalService.execute({
      userId,
      month: installment.month,
      year: installment.year
    })

    return {
      installment: updatedInstallment
    }
  }
}