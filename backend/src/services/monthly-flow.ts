import { ExpenseRepository } from '@/repositories/expense-repository'
import { MonthlyInvestmentRepository } from '@/repositories/monthly-investment-repository'
import { SalaryProfilesRepository } from '@/repositories/salary-profiles-repository'
import { GetMonthlyExpensesService } from './get-monthly-expenses'

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
    private monthlyInvestmentRepository: MonthlyInvestmentRepository,
    private salaryRepository: SalaryProfilesRepository,
    private getMonthlyExpensesService: GetMonthlyExpensesService,
  ) {}

  async execute({ userId, year }: MonthlyFlowRequest): Promise<MonthlyFlowResponse> {
    const monthlyData: MonthlyData[] = []
    const currentSalary = await this.salaryRepository.findCurrentByUser(userId)
    const monthlyIncome = currentSalary?.amount ? Number(currentSalary.amount) : 0

    let yearTotalIncome = 0
    let yearTotalExpenses = 0
    let yearTotalCreditCard = 0
    let yearTotalInvestments = 0

    // Generate data for each month
    for (let month = 1; month <= 12; month++) {
      const monthStr = month.toString().padStart(2, '0')

      // Get expenses for the month
      const expenses = await this.expenseRepository.findByMonthAndUser(userId, monthStr, year)
      const monthlyExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0)

      // Get credit card expenses for the month
      const creditCardData = await this.getMonthlyExpensesService.execute({ userId, month: monthStr, year })
      const monthlyCreditCard = creditCardData.total

      // Get monthly investments
      const investments = await this.monthlyInvestmentRepository.findByMonthAndUser(userId, monthStr, year)
      const monthlyInvestments = investments.reduce((sum, investment) => sum + Number(investment.amount), 0)

      // Calculate balance for the month
      const monthlyBalance = monthlyIncome - monthlyExpenses - monthlyCreditCard - monthlyInvestments

      const monthData: MonthlyData = {
        month: monthStr,
        income: monthlyIncome,
        expenses: monthlyExpenses,
        creditCard: monthlyCreditCard,
        investments: monthlyInvestments,
        balance: monthlyBalance
      }

      monthlyData.push(monthData)

      // Add to year totals
      yearTotalIncome += monthlyIncome
      yearTotalExpenses += monthlyExpenses
      yearTotalCreditCard += monthlyCreditCard
      yearTotalInvestments += monthlyInvestments
    }

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