import { ExpenseRepository } from "@/repositories/expense-repository";
import { InvestmentRepository } from "@/repositories/investment-repository";
import { SalaryProfilesRepository } from "@/repositories/salary-profiles-repository";
import { GetMonthlyExpensesService } from "./get-monthly-expenses";

interface DashboardSummaryRequest {
  userId: string;
  month: string;
  year: number;
}

interface DashboardSummaryResponse {
  currentBalance: number;
  currentBalanceChange: number;
  totalInvestments: number;
  investmentChange: number;
  monthlyExpenses: number;
  expensesChange: number;
  creditCardExpenses: number;
  totalCreditCardInstallments: number;
  salary: number;
  healthScore: number;
}

export class DashboardSummaryService {
  constructor(
    private expenseRepository: ExpenseRepository,
    private investmentRepository: InvestmentRepository,
    private salaryRepository: SalaryProfilesRepository,
    private getMonthlyExpensesService: GetMonthlyExpensesService,
  ) {}

  async execute({
    userId,
    month,
    year,
  }: DashboardSummaryRequest): Promise<DashboardSummaryResponse> {
    // Get current month expenses
    const currentExpenses = await this.expenseRepository.findByMonthAndUser(
      userId,
      month,
      year,
    );
    const currentMonthlyExpenses = currentExpenses.reduce(
      (sum, expense) => sum + Number(expense.amount),
      0,
    );

    // Get previous month expenses for comparison
    const previousMonth =
      month === "01" ? "12" : (parseInt(month) - 1).toString().padStart(2, "0");
    const previousYear = month === "01" ? year - 1 : year;
    const previousExpenses = await this.expenseRepository.findByMonthAndUser(
      userId,
      previousMonth,
      previousYear,
    );
    const previousMonthlyExpenses = previousExpenses.reduce(
      (sum, expense) => sum + Number(expense.amount),
      0,
    );

    // Calculate expenses change
    const expensesChange =
      previousMonthlyExpenses === 0
        ? 0
        : Number(
            ((currentMonthlyExpenses - previousMonthlyExpenses) /
              previousMonthlyExpenses) *
              100,
          ) || 0;

    // Get credit card expenses for current month
    const creditCardData = await this.getMonthlyExpensesService.execute({
      userId,
      month,
      year,
    });
    const totalCreditCardExpenses = creditCardData.total;
    const totalInstallments = creditCardData.expenses.length;

    // Get current salary
    const currentSalary = await this.salaryRepository.findCurrentByUser(userId);
    const salary = currentSalary?.amount ? Number(currentSalary.amount) : 0;

    // Get total investments from unified system
    const investmentsWithPortfolio =
      await this.investmentRepository.findAllPortfolioByUser(userId);
    const totalInvestments = investmentsWithPortfolio.reduce(
      (sum, investment) =>
        sum + Number(investment.gross_yield || investment.amount),
      0,
    );

    // Calculate current balance (salary - expenses - credit card)
    const currentBalance =
      Number(salary) -
      Number(currentMonthlyExpenses) -
      Number(totalCreditCardExpenses);

    // Calculate balance change (simplified - could be improved with historical data)
    const previousBalance = Number(salary) - Number(previousMonthlyExpenses);
    const currentBalanceChange =
      previousBalance === 0
        ? 0
        : Number(
            ((currentBalance - previousBalance) / Math.abs(previousBalance)) *
              100,
          ) || 0;

    // Calculate investment change (simplified - would need historical data for accurate calculation)
    const investmentChange = 0; // Placeholder - should calculate based on previous month portfolio value

    // Calculate health score (0-100)
    const savingsRate =
      salary === 0
        ? 0
        : ((Number(salary) -
            Number(currentMonthlyExpenses) -
            Number(totalCreditCardExpenses)) /
            Number(salary)) *
          100;
    const healthScore = Math.max(0, Math.min(100, Number(savingsRate) || 0));

    return {
      currentBalance,
      currentBalanceChange,
      totalInvestments,
      investmentChange,
      monthlyExpenses: currentMonthlyExpenses,
      expensesChange,
      creditCardExpenses: totalCreditCardExpenses,
      totalCreditCardInstallments: totalInstallments,
      salary,
      healthScore,
    };
  }
}
