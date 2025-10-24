import { FinancialDataRepository } from "@/repositories/financial-data-repository";
import { SalaryProfilesRepository } from "@/repositories/salary-profiles-repository";
import { CreditCardInstallmentsRepository } from "@/repositories/credit-card-installments-repository";
import { CreditCardPurchasesRepository } from "@/repositories/credit-card-purchases-repository";
import { ExpenseRepository } from "@/repositories/expense-repository";
import { MonthlyInvestmentRepository } from "@/repositories/monthly-investment-repository";
import { TaxRepository } from "@/repositories/tax-repository";
import { TransferBalanceToNextMonthService } from "./transfer-balance-to-next-month";
import { ResourceNotFoundError } from "./errors/resource-not-found-error";

interface GetFinancialOverviewServiceRequest {
  userId: string;
  month: string;
  year: number;
}

interface GetFinancialOverviewServiceResponse {
  overview: {
    // Dados financeiros do mês
    financial_data: {
      main_income: number;
      checking_account: number;
      previous_balance: number;
      total_income: number;
      total_expenses: number;
      final_balance: number;
      expense_subtotal: number;
      investment_subtotal: number;
      credit_card_subtotal: number;
      tax_subtotal: number;
    };
    // Informações do salário atual
    salary: {
      amount: number;
      description: string | null;
    } | null;
    // Análise e percentuais
    analysis: {
      expense_percentage: number;
      reserve_percentage: number;
      available_amount: number;
      is_over_budget: boolean;
      monthly_surplus_deficit: number;
    };
  };
}

export class GetFinancialOverviewService {
  constructor(
    private financialDataRepository: FinancialDataRepository,
    private salaryProfilesRepository: SalaryProfilesRepository,
    private creditCardInstallmentsRepository: CreditCardInstallmentsRepository,
    private creditCardPurchasesRepository: CreditCardPurchasesRepository,
    private expenseRepository: ExpenseRepository,
    private monthlyInvestmentRepository: MonthlyInvestmentRepository,
    private taxRepository: TaxRepository,
    private transferBalanceService: TransferBalanceToNextMonthService,
  ) {}

  async execute({
    userId,
    month,
    year,
  }: GetFinancialOverviewServiceRequest): Promise<GetFinancialOverviewServiceResponse> {
    // Verificar e transferir saldo do mês anterior automaticamente
    await this.checkAndTransferPreviousBalance(userId, month, year);

    // Buscar dados financeiros do mês
    let financialData = await this.financialDataRepository.findByUserAndPeriod(
      userId,
      month,
      year,
    );

    // Se não existir dados financeiros para o mês, criar um registro vazio
    if (!financialData) {
      financialData = await this.financialDataRepository.create({
        user_id: userId,
        month,
        year,
        main_income: 0,
        checking_account: 0,
        total_in_account: 0,
      });
    }

    // Buscar salário atual
    const currentSalary =
      await this.salaryProfilesRepository.findCurrentByUser(userId);

    // Buscar gastos reais do cartão de crédito para o mês
    const installments =
      await this.creditCardInstallmentsRepository.findManyByUserAndPeriod(
        userId,
        month,
        year,
      );
    const recurringPurchases =
      await this.creditCardPurchasesRepository.findManyByUser(userId);

    // Buscar expenses reais do mês
    const expenses = await this.expenseRepository.findByMonthAndUser(
      userId,
      month,
      year,
    );

    // Buscar investimentos mensais reais do mês
    const monthlyInvestments =
      await this.monthlyInvestmentRepository.findByMonthAndUser(
        userId,
        month,
        year,
      );

    // Buscar impostos reais do mês
    const taxes = await this.taxRepository.findByMonthAndUser(
      userId,
      month,
      year,
    );

    // Filtrar gastos recorrentes ativos no período
    const activeRecurringPurchases = recurringPurchases.filter((purchase) => {
      if (!purchase.is_recurring) return false;
      const startDate = new Date(
        purchase.start_year,
        parseInt(purchase.start_month) - 1,
      );
      const requestedDate = new Date(year, parseInt(month) - 1);
      return startDate <= requestedDate;
    });

    // Calcular total real de gastos do cartão
    const installmentsTotal = installments.reduce(
      (sum, inst) => sum + Number(inst.installment_amount),
      0,
    );
    const recurringTotal = activeRecurringPurchases.reduce(
      (sum, purchase) => sum + Number(purchase.installment_amount),
      0,
    );
    const realCreditCardTotal = installmentsTotal + recurringTotal;

    // Calcular total real dos expenses
    const realExpensesTotal = expenses.reduce(
      (sum, expense) => sum + Number(expense.amount),
      0,
    );

    // Calcular total real dos investimentos mensais
    const realInvestmentsTotal = monthlyInvestments.reduce(
      (sum, investment) => sum + Number(investment.amount),
      0,
    );

    // Calcular total real dos impostos
    const realTaxesTotal = taxes.reduce(
      (sum, tax) => sum + Number(tax.amount),
      0,
    );

    // Converter Decimal para number para cálculos
    const mainIncome = Number(financialData.main_income);
    const checkingAccount = Number(financialData.checking_account);
    const previousBalance = Number(financialData.previous_balance);

    // Calcular receita total dinamicamente - incluir salário se disponível
    const salaryAmount = currentSalary
      ? Number(currentSalary.amount)
      : mainIncome;
    const totalIncome = salaryAmount + checkingAccount + previousBalance;

    // Usar dados reais do cartão, expenses, investimentos e impostos em vez dos stored values
    const creditCardSubtotal = realCreditCardTotal;
    const expenseSubtotal = realExpensesTotal;
    const investmentSubtotal = realInvestmentsTotal;
    const taxSubtotal = realTaxesTotal;
    const totalExpenses =
      expenseSubtotal + creditCardSubtotal + taxSubtotal + investmentSubtotal;
    const finalBalance = totalIncome - totalExpenses;

    // Usar salário como referência para cálculos se disponível, senão usar receita total
    const referenceIncome = currentSalary
      ? Number(currentSalary.amount)
      : totalIncome;

    // Calcular percentuais e análises
    const expensePercentage =
      referenceIncome > 0 ? (totalExpenses / referenceIncome) * 100 : 0;

    // Taxa de reserva: excluir investimentos (investir é positivo, não gasto)
    const expensesWithoutInvestments = expenseSubtotal + creditCardSubtotal + taxSubtotal;
    const reserveAmount = totalIncome - expensesWithoutInvestments;
    const reservePercentage =
      totalIncome > 0 ? (reserveAmount / totalIncome) * 100 : 0;

    const availableAmount = totalIncome - totalExpenses; // Usar receita total, não referência
    const isOverBudget = totalExpenses > totalIncome; // Comparar com receita total
    const monthlySurplusDeficit = totalIncome - totalExpenses; // Usar receita total

    return {
      overview: {
        financial_data: {
          main_income: mainIncome,
          checking_account: checkingAccount,
          previous_balance: previousBalance,
          total_income: totalIncome,
          total_expenses: totalExpenses,
          final_balance: finalBalance,
          expense_subtotal: expenseSubtotal,
          investment_subtotal: investmentSubtotal,
          credit_card_subtotal: creditCardSubtotal,
          tax_subtotal: taxSubtotal,
          is_confirmed: financialData.is_confirmed || false,
        },
        salary: currentSalary
          ? {
              amount: Number(currentSalary.amount),
              description: currentSalary.description,
            }
          : null,
        analysis: {
          expense_percentage: Math.round(expensePercentage * 100) / 100,
          reserve_percentage: Math.round(reservePercentage * 100) / 100,
          reserve_amount: reserveAmount,
          available_amount: availableAmount,
          is_over_budget: isOverBudget,
          monthly_surplus_deficit: monthlySurplusDeficit,
        },
      },
    };
  }

  private async checkAndTransferPreviousBalance(
    userId: string,
    month: string,
    year: number,
  ): Promise<void> {
    // Calcular mês e ano anterior
    const currentMonthInt = parseInt(month);
    const previousMonth = currentMonthInt === 1 ? 12 : currentMonthInt - 1;
    const previousYear = currentMonthInt === 1 ? year - 1 : year;
    const previousMonthStr = previousMonth.toString().padStart(2, "0");

    // Verificar se já existe dados para o mês atual
    const currentMonthData =
      await this.financialDataRepository.findByUserAndPeriod(
        userId,
        month,
        year,
      );

    // Se já tem dados no mês atual e já tem previous_balance, não transferir novamente
    if (currentMonthData && Number(currentMonthData.previous_balance) > 0) {
      return;
    }

    // Verificar se existe dados do mês anterior
    const previousMonthData =
      await this.financialDataRepository.findByUserAndPeriod(
        userId,
        previousMonthStr,
        previousYear,
      );

    if (!previousMonthData) {
      return; // Não há mês anterior para transferir
    }

    // Só transferir se o mês anterior foi confirmado
    if (!previousMonthData.is_confirmed) {
      return; // Mês anterior ainda não foi confirmado
    }

    // Calcular saldo do mês anterior
    const previousBalance =
      Number(previousMonthData.total_income) -
      Number(previousMonthData.total_expenses);

    if (previousBalance > 0) {
      // Transferir saldo automaticamente
      await this.transferBalanceService.execute({
        userId,
        fromMonth: previousMonthStr,
        fromYear: previousYear,
      });
    }
  }
}
