import { ExpenseRepository } from "@/repositories/expense-repository";
import { InvestmentRepository } from "@/repositories/investment-repository";
import { SalaryProfilesRepository } from "@/repositories/salary-profiles-repository";
import { GetMonthlyExpensesService } from "./get-monthly-expenses";
import { GetFinancialOverviewService } from "./get-financial-overview";

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
}

export class DashboardSummaryService {
  constructor(
    private expenseRepository: ExpenseRepository,
    private investmentRepository: InvestmentRepository,
    private salaryRepository: SalaryProfilesRepository,
    private getMonthlyExpensesService: GetMonthlyExpensesService,
    private getFinancialOverviewService: GetFinancialOverviewService,
  ) {}

  async execute({
    userId,
    month,
    year,
  }: DashboardSummaryRequest): Promise<DashboardSummaryResponse> {
    // Get full financial overview for accurate balance
    const { overview } = await this.getFinancialOverviewService.execute({
      userId,
      month,
      year,
    });

    const currentBalance = overview.financial_data.final_balance;
    const currentMonthlyExpenses = overview.financial_data.total_expenses;
    const totalCreditCardExpenses = overview.financial_data.credit_card_subtotal;
    const salary = overview.financial_data.main_income;

    // Get previous month overview for comparison
    const previousMonth =
      month === "01" ? "12" : (parseInt(month) - 1).toString().padStart(2, "0");
    const previousYear = month === "01" ? year - 1 : year;

    let previousBalance = 0;
    let previousMonthlyExpenses = 0;
    try {
      const { overview: prevOverview } = await this.getFinancialOverviewService.execute({
        userId,
        month: previousMonth,
        year: previousYear,
      });
      previousBalance = prevOverview.financial_data.final_balance;
      previousMonthlyExpenses = prevOverview.financial_data.total_expenses;
    } catch {
      // Previous month may not exist
    }

    // Calculate expenses change
    const expensesChange =
      previousMonthlyExpenses === 0
        ? 0
        : Number(
            ((currentMonthlyExpenses - previousMonthlyExpenses) /
              previousMonthlyExpenses) *
              100,
          ) || 0;

    // Get credit card installments count
    const creditCardData = await this.getMonthlyExpensesService.execute({
      userId,
      month,
      year,
    });
    const totalInstallments = creditCardData.expenses.length;

    // Total de investimentos: mesma regra do portfólio/navbar — considera
    // apenas posições ATIVAS e não vencidas, somando o valor bruto atual
    // (gross_yield) ou o valor aplicado quando não houver. Sem o filtro, o
    // total ficava inflado por CDBs vencidos/resgatados (MATURED/SOLD).
    const investmentsWithPortfolio =
      await this.investmentRepository.findAllPortfolioByUser(userId);
    const countableInvestments = investmentsWithPortfolio.filter((investment) => {
      if (investment.status !== "ACTIVE") return false;
      if (investment.maturity_date && investment.maturity_date.getTime() <= Date.now()) return false;
      return true;
    });
    const totalInvestments = countableInvestments.reduce(
      (sum, investment) => {
        const amount = Number(investment.amount)
        const qty = investment.quantity ? Number(investment.quantity) : 1
        const effectiveAmount = investment.investment_type === 'ETF' || investment.investment_type === 'FII' ? amount * qty : amount
        return sum + Number(investment.gross_yield || effectiveAmount)
      },
      0,
    );

    // Calculate balance change
    const currentBalanceChange =
      previousBalance === 0
        ? 0
        : Number(
            ((currentBalance - previousBalance) / Math.abs(previousBalance)) *
              100,
          ) || 0;

    // Calculate investment change (simplified - would need historical data for accurate calculation)
    const investmentChange = 0;

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
    };
  }
}
