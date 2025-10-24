import { FinancialDataRepository } from '@/repositories/financial-data-repository'

interface TransferBalanceToNextMonthServiceRequest {
  userId: string
  fromMonth: string
  fromYear: number
}

export class TransferBalanceToNextMonthService {
  constructor(private financialDataRepository: FinancialDataRepository) {}

  async execute({
    userId,
    fromMonth,
    fromYear
  }: TransferBalanceToNextMonthServiceRequest): Promise<void> {
    // Buscar dados financeiros do mês atual
    const currentMonthData = await this.financialDataRepository.findByUserAndPeriod(userId, fromMonth, fromYear)

    if (!currentMonthData) {
      return // Não há dados para transferir
    }

    // Calcular próximo mês/ano
    const currentMonthInt = parseInt(fromMonth)
    const nextMonth = currentMonthInt === 12 ? 1 : currentMonthInt + 1
    const nextYear = currentMonthInt === 12 ? fromYear + 1 : fromYear
    const nextMonthStr = nextMonth.toString().padStart(2, '0')

    // Calcular saldo final do mês atual
    const finalBalance = Number(currentMonthData.total_income) - Number(currentMonthData.total_expenses)

    if (finalBalance <= 0) {
      return // Não há saldo positivo para transferir
    }

    // Buscar ou criar dados do próximo mês
    let nextMonthData = await this.financialDataRepository.findByUserAndPeriod(userId, nextMonthStr, nextYear)

    if (!nextMonthData) {
      // Criar novo registro para o próximo mês
      nextMonthData = await this.financialDataRepository.create({
        user_id: userId,
        month: nextMonthStr,
        year: nextYear,
        main_income: 0,
        checking_account: 0,
        previous_balance: finalBalance,
        total_in_account: finalBalance,
        expense_subtotal: 0,
        investment_subtotal: 0,
        credit_card_subtotal: 0,
        tax_subtotal: 0,
        total_income: finalBalance,
        total_expenses: 0,
        final_balance: finalBalance,
        expected_total_money: 0
      })
    } else {
      // Atualizar saldo anterior do próximo mês
      const updatedTotalIncome = Number(nextMonthData.main_income) + finalBalance
      const updatedTotalInAccount = Number(nextMonthData.checking_account) + Number(nextMonthData.main_income) + finalBalance
      const updatedFinalBalance = updatedTotalIncome - Number(nextMonthData.total_expenses)

      await this.financialDataRepository.update(nextMonthData.id, {
        previous_balance: finalBalance,
        total_income: updatedTotalIncome,
        total_in_account: updatedTotalInAccount,
        final_balance: updatedFinalBalance
      })
    }
  }
}