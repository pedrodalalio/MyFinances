import { Prisma } from "@prisma/client";
import {
  computeMonthTotals,
  MonthSummaryService,
} from "./month-summary";
import { previousPeriod } from "./utils/period";
import { toDecimal } from "./utils/money";

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
      is_confirmed: boolean;
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
      reserve_amount: number;
      available_amount: number;
      is_over_budget: boolean;
      monthly_surplus_deficit: number;
    };
  };
}

// GET puro: não cria nem atualiza nada. O saldo anterior é lido do registro
// do mês; se ainda não foi persistido (mês anterior confirmado antes de o
// carry-over existir, ou registro ainda não criado), é derivado ao vivo do
// mês anterior — sem gravar. Quem persiste é o fechamento do mês.
export class GetFinancialOverviewService {
  constructor(
    private monthSummaryService: MonthSummaryService,
  ) {}

  async execute({
    userId,
    month,
    year,
  }: GetFinancialOverviewServiceRequest): Promise<GetFinancialOverviewServiceResponse> {
    const records = await this.monthSummaryService.fetch({ userId, month, year });

    let previousBalance = toDecimal(records.financialData?.previous_balance);

    if (previousBalance.isZero()) {
      const prev = previousPeriod({ month, year });
      const prevTotals = await this.monthSummaryService.execute({
        userId,
        month: prev.month,
        year: prev.year,
      });

      // Só herda saldo de mês anterior fechado (mesma regra do confirm-month)
      if (prevTotals.isConfirmed) {
        previousBalance = prevTotals.finalBalance;
      }
    }

    const totals = computeMonthTotals(records, { month, year, previousBalance });

    const totalIncome = totals.totalIncome.toNumber();
    const totalExpenses = totals.totalExpenses.toNumber();
    const availableAmount = totals.finalBalance.toNumber();

    // Usar salário como referência para percentuais se disponível, senão a receita total
    const referenceIncome = records.salary
      ? toDecimal(records.salary.amount).toNumber()
      : totalIncome;

    const expensePercentage =
      referenceIncome > 0 ? (totalExpenses / referenceIncome) * 100 : 0;

    // Taxa de reserva = saving rate: quanto da receita não foi consumida
    // (sobra em conta + investimentos do mês)
    const reserveAmount = totals.totalIncome.sub(totals.totalExpenses).toNumber();
    const reservePercentage =
      totalIncome > 0 ? (reserveAmount / totalIncome) * 100 : 0;

    const isOverBudget = totals.totalOutflows.gt(totals.totalIncome);

    return {
      overview: {
        financial_data: {
          main_income: totals.mainIncome.toNumber(),
          checking_account: totals.checkingAccount.toNumber(),
          previous_balance: totals.previousBalance.toNumber(),
          total_income: totalIncome,
          total_expenses: totalExpenses,
          final_balance: availableAmount,
          expense_subtotal: totals.expenseSubtotal.toNumber(),
          income_subtotal: totals.incomeSubtotal.toNumber(),
          investment_subtotal: totals.investmentSubtotal.toNumber(),
          credit_card_subtotal: totals.creditCardSubtotal.toNumber(),
          tax_subtotal: totals.taxSubtotal.toNumber(),
          is_confirmed: totals.isConfirmed,
        },
        salary: records.salary
          ? {
              amount: toDecimal(records.salary.amount).toNumber(),
              description: records.salary.description,
            }
          : null,
        analysis: {
          expense_percentage: Math.round(expensePercentage * 100) / 100,
          reserve_percentage: Math.round(reservePercentage * 100) / 100,
          reserve_amount: reserveAmount,
          available_amount: availableAmount,
          is_over_budget: isOverBudget,
          monthly_surplus_deficit: availableAmount,
        },
      },
    };
  }
}
