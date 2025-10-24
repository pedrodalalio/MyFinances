import { FinancialData } from '@prisma/client'
import { FinancialDataRepository } from '@/repositories/financial-data-repository'

interface UpdateMonthlyValuesServiceRequest {
  userId: string
  month: string
  year: number
  main_income?: number
  checking_account?: number
  previous_balance?: number
}

interface UpdateMonthlyValuesServiceResponse {
  financialData: FinancialData
}

export class UpdateMonthlyValuesService {
  constructor(private financialDataRepository: FinancialDataRepository) {}

  async execute({
    userId,
    month,
    year,
    main_income,
    checking_account,
    previous_balance
  }: UpdateMonthlyValuesServiceRequest): Promise<UpdateMonthlyValuesServiceResponse> {
    // Buscar ou criar FinancialData para o mês
    let financialData = await this.financialDataRepository.findByUserAndPeriod(userId, month, year)

    if (!financialData) {
      // Criar novo registro se não existir
      financialData = await this.financialDataRepository.create({
        user_id: userId,
        month,
        year,
        main_income: main_income || 0,
        checking_account: checking_account || 0,
        previous_balance: previous_balance || 0,
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

    // Preparar dados para atualização
    const updateData: any = {}

    if (main_income !== undefined) updateData.main_income = main_income
    if (checking_account !== undefined) updateData.checking_account = checking_account
    if (previous_balance !== undefined) updateData.previous_balance = previous_balance

    // Recalcular totais
    const newMainIncome = main_income !== undefined ? main_income : Number(financialData.main_income)
    const newCheckingAccount = checking_account !== undefined ? checking_account : Number(financialData.checking_account)
    const newPreviousBalance = previous_balance !== undefined ? previous_balance : Number(financialData.previous_balance)

    updateData.total_income = newMainIncome + newPreviousBalance
    updateData.total_in_account = newMainIncome + newCheckingAccount + newPreviousBalance
    updateData.final_balance = updateData.total_income - Number(financialData.total_expenses)

    // Atualizar dados
    const updatedFinancialData = await this.financialDataRepository.update(financialData.id, updateData)

    return {
      financialData: updatedFinancialData
    }
  }
}