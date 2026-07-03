import { FinancialDataRepository } from '@/repositories/financial-data-repository'
import { computeMonthTotals, MonthSummaryService } from './month-summary'
import { nextPeriod } from './utils/period'

interface TransferBalanceToNextMonthServiceRequest {
  userId: string
  fromMonth: string
  fromYear: number
}

export class TransferBalanceToNextMonthService {
  constructor(
    private financialDataRepository: FinancialDataRepository,
    private monthSummaryService: MonthSummaryService,
  ) {}

  async execute({
    userId,
    fromMonth,
    fromYear
  }: TransferBalanceToNextMonthServiceRequest): Promise<void> {
    const records = await this.monthSummaryService.fetch({
      userId,
      month: fromMonth,
      year: fromYear,
    })

    if (!records.financialData) {
      return // Não há dados para transferir
    }

    // Saldo calculado ao vivo pela regra única do mês (não pelos subtotais
    // pré-computados de FinancialData, que podem estar defasados)
    const totals = computeMonthTotals(records, { month: fromMonth, year: fromYear })

    if (totals.finalBalance.lte(0)) {
      return // Não há saldo positivo para transferir
    }

    const next = nextPeriod({ month: fromMonth, year: fromYear })

    const nextMonthData = await this.financialDataRepository.findByUserAndPeriod(
      userId,
      next.month,
      next.year,
    )

    if (!nextMonthData) {
      await this.financialDataRepository.create({
        user_id: userId,
        month: next.month,
        year: next.year,
        main_income: 0,
        checking_account: 0,
        previous_balance: totals.finalBalance,
        total_in_account: 0,
      })
    } else {
      await this.financialDataRepository.update(nextMonthData.id, {
        previous_balance: totals.finalBalance,
      })
    }
  }
}
