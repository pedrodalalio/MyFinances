import { Prisma, FinancialData, SalaryProfile } from "@prisma/client";
import { FinancialDataRepository } from "@/repositories/financial-data-repository";
import { SalaryProfilesRepository } from "@/repositories/salary-profiles-repository";
import { CreditCardInstallmentsRepository } from "@/repositories/credit-card-installments-repository";
import { CreditCardPurchasesRepository } from "@/repositories/credit-card-purchases-repository";
import { ExpenseRepository } from "@/repositories/expense-repository";
import { IncomeRepository } from "@/repositories/income-repository";
import { InvestmentRepository } from "@/repositories/investment-repository";
import { TaxRepository } from "@/repositories/tax-repository";
import { isRecurringActive } from "./utils/recurring-expense";
import { investmentOutflow, sumAmounts, toDecimal, ZERO } from "./utils/money";

// Fonte única da regra "cálculo do mês". Overview, fechamento de mês e
// transferência de saldo derivam TODOS os totais daqui — sempre a partir dos
// lançamentos reais (nunca dos subtotais pré-computados de FinancialData) e
// sempre em Prisma.Decimal.

export interface MonthRecords {
  financialData: FinancialData | null;
  salary: SalaryProfile | null;
  installments: Awaited<ReturnType<CreditCardInstallmentsRepository["findManyByUserAndPeriod"]>>;
  recurringPurchases: Awaited<ReturnType<CreditCardPurchasesRepository["findManyByUser"]>>;
  expenses: Awaited<ReturnType<ExpenseRepository["findByMonthAndUser"]>>;
  incomes: Awaited<ReturnType<IncomeRepository["findByMonthAndUser"]>>;
  investments: Awaited<ReturnType<InvestmentRepository["findByMonthAndUser"]>>;
  taxes: Awaited<ReturnType<TaxRepository["findByMonthAndUser"]>>;
}

export interface MonthTotals {
  mainIncome: Prisma.Decimal;
  checkingAccount: Prisma.Decimal;
  previousBalance: Prisma.Decimal;
  salaryAmount: Prisma.Decimal;
  incomeSubtotal: Prisma.Decimal;
  expenseSubtotal: Prisma.Decimal;
  creditCardSubtotal: Prisma.Decimal;
  investmentSubtotal: Prisma.Decimal;
  taxSubtotal: Prisma.Decimal;
  totalIncome: Prisma.Decimal;
  // Gastos (despesas + cartão + impostos), sem investimentos
  totalExpenses: Prisma.Decimal;
  // Tudo que saiu da conta corrente (gastos + investimentos)
  totalOutflows: Prisma.Decimal;
  finalBalance: Prisma.Decimal;
  isConfirmed: boolean;
}

interface ComputeOptions {
  month: string;
  year: number;
  // Sobrepõe o previous_balance armazenado (ex.: derivado do mês anterior)
  previousBalance?: Prisma.Decimal;
}

export function computeMonthTotals(
  records: MonthRecords,
  { month, year, previousBalance }: ComputeOptions,
): MonthTotals {
  const { financialData, salary } = records;

  const activeRecurring = records.recurringPurchases.filter(
    (p) => p.is_recurring && isRecurringActive(p, month, year),
  );

  const creditCardSubtotal = sumAmounts(records.installments, (i) => i.installment_amount)
    .add(sumAmounts(activeRecurring, (p) => p.installment_amount));
  const expenseSubtotal = sumAmounts(records.expenses, (e) => e.amount);
  const incomeSubtotal = sumAmounts(records.incomes, (i) => i.amount);
  const taxSubtotal = sumAmounts(records.taxes, (t) => t.amount);
  const investmentSubtotal = records.investments.reduce(
    (sum, investment) => sum.add(investmentOutflow(investment)),
    ZERO,
  );

  const mainIncome = toDecimal(financialData?.main_income);
  const checkingAccount = toDecimal(financialData?.checking_account);
  const resolvedPreviousBalance =
    previousBalance ?? toDecimal(financialData?.previous_balance);

  const salaryAmount = salary ? toDecimal(salary.amount) : mainIncome;

  const totalIncome = salaryAmount
    .add(checkingAccount)
    .add(resolvedPreviousBalance)
    .add(incomeSubtotal);
  const totalExpenses = expenseSubtotal.add(creditCardSubtotal).add(taxSubtotal);
  const totalOutflows = totalExpenses.add(investmentSubtotal);
  const finalBalance = totalIncome.sub(totalOutflows);

  return {
    mainIncome,
    checkingAccount,
    previousBalance: resolvedPreviousBalance,
    salaryAmount,
    incomeSubtotal,
    expenseSubtotal,
    creditCardSubtotal,
    investmentSubtotal,
    taxSubtotal,
    totalIncome,
    totalExpenses,
    totalOutflows,
    finalBalance,
    isConfirmed: financialData?.is_confirmed ?? false,
  };
}

interface MonthSummaryRequest {
  userId: string;
  month: string;
  year: number;
}

export class MonthSummaryService {
  constructor(
    private financialDataRepository: FinancialDataRepository,
    private salaryProfilesRepository: SalaryProfilesRepository,
    private creditCardInstallmentsRepository: CreditCardInstallmentsRepository,
    private creditCardPurchasesRepository: CreditCardPurchasesRepository,
    private expenseRepository: ExpenseRepository,
    private incomeRepository: IncomeRepository,
    private investmentRepository: InvestmentRepository,
    private taxRepository: TaxRepository,
  ) {}

  async fetch({ userId, month, year }: MonthSummaryRequest): Promise<MonthRecords> {
    const [
      financialData,
      salary,
      installments,
      recurringPurchases,
      expenses,
      incomes,
      investments,
      taxes,
    ] = await Promise.all([
      this.financialDataRepository.findByUserAndPeriod(userId, month, year),
      this.salaryProfilesRepository.findCurrentByUser(userId),
      this.creditCardInstallmentsRepository.findManyByUserAndPeriod(userId, month, year),
      this.creditCardPurchasesRepository.findManyByUser(userId),
      this.expenseRepository.findByMonthAndUser(userId, month, year),
      this.incomeRepository.findByMonthAndUser(userId, month, year),
      this.investmentRepository.findByMonthAndUser(userId, month, year),
      this.taxRepository.findByMonthAndUser(userId, month, year),
    ]);

    return {
      financialData,
      salary,
      installments,
      recurringPurchases,
      expenses,
      incomes,
      investments,
      taxes,
    };
  }

  async execute(request: MonthSummaryRequest): Promise<MonthTotals> {
    const records = await this.fetch(request);
    return computeMonthTotals(records, {
      month: request.month,
      year: request.year,
    });
  }
}
