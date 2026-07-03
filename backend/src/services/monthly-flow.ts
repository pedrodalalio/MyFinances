import { ExpenseRepository } from '@/repositories/expense-repository'
import { InvestmentRepository } from '@/repositories/investment-repository'
import { SalaryProfilesRepository } from '@/repositories/salary-profiles-repository'
import { GetMonthlyExpensesService } from './get-monthly-expenses'
import { formatMonth } from './utils/period'
import { investmentOutflow, sumAmounts, ZERO } from './utils/money'

interface MonthlyFlowRequest {
  userId: string
  year: number
}

interface MonthlyData {
  month: string
  income: number
  expenses: number
  creditCard: number
  investments: number
  balance: number
}

interface MonthlyFlowResponse {
  monthlyData: MonthlyData[]
  yearTotal: {
    income: number
    expenses: number
    creditCard: number
    investments: number
    balance: number
  }
}

export class MonthlyFlowService {
  constructor(
    private expenseRepository: ExpenseRepository,
    private investmentRepository: InvestmentRepository,
    private salaryRepository: SalaryProfilesRepository,
    private getMonthlyExpensesService: GetMonthlyExpensesService,
  ) {}

  async execute({ userId, year }: MonthlyFlowRequest): Promise<MonthlyFlowResponse> {
    const currentSalary = await this.salaryRepository.findCurrentByUser(userId)
    const monthlyIncome = currentSalary?.amount ? Number(currentSalary.amount) : 0

    // Buscar os 12 meses em paralelo
    const months = Array.from({ length: 12 }, (_, i) => formatMonth(i + 1))
    const monthlyData: MonthlyData[] = await Promise.all(
      months.map(async (monthStr) => {
        const [expenses, creditCardData, investments] = await Promise.all([
          this.expenseRepository.findByMonthAndUser(userId, monthStr, year),
          this.getMonthlyExpensesService.execute({ userId, month: monthStr, year }),
          this.investmentRepository.findByMonthAndUser(userId, monthStr, year),
        ])

        const monthlyExpenses = sumAmounts(expenses, (e) => e.amount).toNumber()
        const monthlyCreditCard = creditCardData.total
        const monthlyInvestments = investments
          .reduce((sum, investment) => sum.add(investmentOutflow(investment)), ZERO)
          .toNumber()

        return {
          month: monthStr,
          income: monthlyIncome,
          expenses: monthlyExpenses,
          creditCard: monthlyCreditCard,
          investments: monthlyInvestments,
          balance: monthlyIncome - monthlyExpenses - monthlyCreditCard - monthlyInvestments,
        }
      }),
    )

    const yearTotalIncome = monthlyData.reduce((sum, m) => sum + m.income, 0)
    const yearTotalExpenses = monthlyData.reduce((sum, m) => sum + m.expenses, 0)
    const yearTotalCreditCard = monthlyData.reduce((sum, m) => sum + m.creditCard, 0)
    const yearTotalInvestments = monthlyData.reduce((sum, m) => sum + m.investments, 0)

    const yearTotalBalance = yearTotalIncome - yearTotalExpenses - yearTotalCreditCard - yearTotalInvestments

    return {
      monthlyData,
      yearTotal: {
        income: yearTotalIncome,
        expenses: yearTotalExpenses,
        creditCard: yearTotalCreditCard,
        investments: yearTotalInvestments,
        balance: yearTotalBalance
      }
    }
  }
}