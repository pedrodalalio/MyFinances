import { CreditCardInstallmentsRepository } from '@/repositories/credit-card-installments-repository'
import { CreditCardPurchasesRepository } from '@/repositories/credit-card-purchases-repository'
import { FinancialDataRepository } from '@/repositories/financial-data-repository'
import { isRecurringActive } from './utils/recurring-expense'
import { sumAmounts } from './utils/money'

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
    const activeRecurringPurchases = recurringPurchases.filter(
      (purchase) => purchase.is_recurring && isRecurringActive(purchase, month, year),
    )

    // Total de cartão de crédito (parcelas + recorrentes), em Decimal
    const creditCardSubtotal = sumAmounts(installments, (i) => i.installment_amount)
      .add(sumAmounts(activeRecurringPurchases, (p) => p.installment_amount))

    // Buscar ou criar FinancialData para o mês (upsert para evitar race condition)
    let financialData = await this.financialDataRepository.findByUserAndPeriod(userId, month, year)

    if (!financialData) {
      financialData = await this.financialDataRepository.upsert(userId, month, year, {
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