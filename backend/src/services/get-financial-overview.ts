import { FinancialDataRepository } from "@/repositories/financial-data-repository";
import { SalaryProfilesRepository } from "@/repositories/salary-profiles-repository";
import { CreditCardInstallmentsRepository } from "@/repositories/credit-card-installments-repository";
import { CreditCardPurchasesRepository } from "@/repositories/credit-card-purchases-repository";
import { ExpenseRepository } from "@/repositories/expense-repository";
import { IncomeRepository } from "@/repositories/income-repository";
import { InvestmentRepository } from "@/repositories/investment-repository";
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
      income_subtotal: number;
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
    private incomeRepository: IncomeRepository,
    private investmentRepository: InvestmentRepository,
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

    // Buscar entradas extras do mês
    const incomes = await this.incomeRepository.findByMonthAndUser(
      userId,
      month,
      year,
    );

    // Buscar investimentos mensais reais do mês
    const monthlyInvestments =
      await this.investmentRepository.findByMonthAndUser(
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

    // Calcular total real das entradas extras
    const realIncomesTotal = incomes.reduce(
      (sum, income) => sum + Number(income.amount),
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

    // Calcular receita total dinamicamente - incluir salário e entradas extras
    const salaryAmount = currentSalary
      ? Number(currentSalary.amount)
      : mainIncome;
    const incomeSubtotal = realIncomesTotal;
    const totalIncome = salaryAmount + checkingAccount + previousBalance + incomeSubtotal;

    // Usar dados reais do cartão, expenses, investimentos e impostos em vez dos stored values
    const creditCardSubtotal = realCreditCardTotal;
    const expenseSubtotal = realExpensesTotal;
    const investmentSubtotal = realInvestmentsTotal;
    const taxSubtotal = realTaxesTotal;
    const totalExpenses =
      expenseSubtotal + creditCardSubtotal + taxSubtotal;
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
          income_subtotal: incomeSubtotal,
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

    // Calcular saldo do mês anterior DINAMICAMENTE (igual ao confirm-month)
    const prevSalary = await this.salaryProfilesRepository.findCurrentByUser(userId);
    const prevInstallments = await this.creditCardInstallmentsRepository.findManyByUserAndPeriod(userId, previousMonthStr, previousYear);
    const prevRecurringPurchases = await this.creditCardPurchasesRepository.findManyByUser(userId);
    const prevExpenses = await this.expenseRepository.findByMonthAndUser(userId, previousMonthStr, previousYear);
    const prevIncomes = await this.incomeRepository.findByMonthAndUser(userId, previousMonthStr, previousYear);
    const prevInvestments = await this.investmentRepository.findByMonthAndUser(userId, previousMonthStr, previousYear);
    const prevTaxes = await this.taxRepository.findByMonthAndUser(userId, previousMonthStr, previousYear);

    const activeRecurring = prevRecurringPurchases.filter((p) => {
      if (!p.is_recurring) return false;
      const startDate = new Date(p.start_year, parseInt(p.start_month) - 1);
      const requestedDate = new Date(previousYear, parseInt(previousMonthStr) - 1);
      return startDate <= requestedDate;
    });

    const creditCardTotal = prevInstallments.reduce((s, i) => s + Number(i.installment_amount), 0)
      + activeRecurring.reduce((s, p) => s + Number(p.installment_amount), 0);
    const expensesTotal = prevExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const incomesTotal = prevIncomes.reduce((s, i) => s + Number(i.amount), 0);
    const investmentsTotal = prevInvestments.reduce((s, i) => s + Number(i.amount), 0);
    const taxesTotal = prevTaxes.reduce((s, t) => s + Number(t.amount), 0);

    const prevSalaryAmount = prevSalary ? Number(prevSalary.amount) : Number(previousMonthData.main_income);
    const prevTotalIncome = prevSalaryAmount + Number(previousMonthData.checking_account) + Number(previousMonthData.previous_balance) + incomesTotal;
    const prevTotalExpenses = expensesTotal + creditCardTotal + taxesTotal + investmentsTotal;
    const previousBalance = prevTotalIncome - prevTotalExpenses;

    if (previousBalance > 0) {
      // Salvar diretamente no mês atual
      if (currentMonthData) {
        await this.financialDataRepository.update(currentMonthData.id, {
          previous_balance: previousBalance,
        });
      } else {
        await this.financialDataRepository.create({
          user_id: userId,
          month,
          year,
          main_income: 0,
          checking_account: 0,
          previous_balance: previousBalance,
          total_in_account: 0,
        });
      }
    }
  }
}
