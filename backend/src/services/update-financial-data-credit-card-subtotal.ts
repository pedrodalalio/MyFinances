import { CreditCardInstallmentsRepository } from '@/repositories/credit-card-installments-repository'
import { CreditCardPurchasesRepository } from '@/repositories/credit-card-purchases-repository'
import { FinancialDataRepository } from '@/repositories/financial-data-repository'

interface UpdateFinancialDataCreditCardSubtotalServiceRequest {
  userId: string
  month: string
  year: number
}

export class UpdateFinancialDataCreditCardSubtotalService {
  constructor(
    private creditCardInstallmentsRepository: CreditCardInstallmentsRepository,
    private creditCardPurchasesRepository: CreditCardPurchasesRepository,
    private financialDataRepository: FinancialDataRepository
  ) {}

  async execute({
    userId,
    month,
    year
  }: UpdateFinancialDataCreditCardSubtotalServiceRequest): Promise<void> {
    // Buscar parcelas do mês
    const installments = await this.creditCardInstallmentsRepository.findManyByUserAndPeriod(userId, month, year)

    // Buscar gastos recorrentes ativos
    const recurringPurchases = await this.creditCardPurchasesRepository.findManyByUser(userId)
    const activeRecurringPurchases = recurringPurchases.filter(purchase => {
      if (!purchase.is_recurring) return false

      // Verificar se já estava ativo no período solicitado
      const startDate = new Date(purchase.start_year, parseInt(purchase.start_month) - 1)
      const requestedDate = new Date(year, parseInt(month) - 1)

      return startDate <= requestedDate
    })

    // Calcular total de parcelas
    const installmentsTotal = installments.reduce((sum, installment) => sum + Number(installment.installment_amount), 0)

    // Calcular total de recorrentes
    const recurringTotal = activeRecurringPurchases.reduce((sum, purchase) => sum + Number(purchase.installment_amount), 0)

    // Total de cartão de crédito
    const creditCardSubtotal = installmentsTotal + recurringTotal

    // Buscar ou criar FinancialData para o mês
    let financialData = await this.financialDataRepository.findByUserAndPeriod(userId, month, year)

    if (!financialData) {
      // Criar novo registro se não existir
      financialData = await this.financialDataRepository.create({
        user_id: userId,
        month,
        year,
        main_income: 0,
        checking_account: 0,
        total_in_account: 0,
        expense_subtotal: 0,
        investment_subtotal: 0,
        credit_card_subtotal: 0,
        tax_subtotal: 0,
        total_income: 0,
        total_expenses: 0,
        final_balance: 0,
        expected_total_money: 0
      })
    }

    // Atualizar o subtotal de cartão de crédito
    await this.financialDataRepository.updateCreditCardSubtotal(financialData.id, creditCardSubtotal)
  }
}