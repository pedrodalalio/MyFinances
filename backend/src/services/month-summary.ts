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

// Snapshot serializável (números) gravado no fechamento em FinancialData.
// closing_snapshot. Congela o mês: a partir daí o overview o exibe como está,
// imune a edições posteriores nos lançamentos.
export interface ClosingSnapshot {
  mainIncome: number;
  checkingAccount: number;
  previousBalance: number;
  salaryAmount: number;
  incomeSubtotal: number;
  expenseSubtotal: number;
  creditCardSubtotal: number;
  investmentSubtotal: number;
  taxSubtotal: number;
  totalIncome: number;
  totalExpenses: number;
  totalOutflows: number;
  finalBalance: number;
}

export function snapshotFromTotals(totals: MonthTotals): ClosingSnapshot {
  return {
    mainIncome: totals.mainIncome.toNumber(),
    checkingAccount: totals.checkingAccount.toNumber(),
    previousBalance: totals.previousBalance.toNumber(),
    salaryAmount: totals.salaryAmount.toNumber(),
    incomeSubtotal: totals.incomeSubtotal.toNumber(),
    expenseSubtotal: totals.expenseSubtotal.toNumber(),
    creditCardSubtotal: totals.creditCardSubtotal.toNumber(),
    investmentSubtotal: totals.investmentSubtotal.toNumber(),
    taxSubtotal: totals.taxSubtotal.toNumber(),
    totalIncome: totals.totalIncome.toNumber(),
    totalExpenses: totals.totalExpenses.toNumber(),
    totalOutflows: totals.totalOutflows.toNumber(),
    finalBalance: totals.finalBalance.toNumber(),
  };
}

// Reconstrói MonthTotals (Decimal) a partir do snapshot congelado, para o
// overview reaproveitar a mesma montagem de resposta do caminho ao vivo.
export function totalsFromSnapshot(snapshot: ClosingSnapshot): MonthTotals {
  return {
    mainIncome: toDecimal(snapshot.mainIncome),
    checkingAccount: toDecimal(snapshot.checkingAccount),
    previousBalance: toDecimal(snapshot.previousBalance),
    salaryAmount: toDecimal(snapshot.salaryAmount),
    incomeSubtotal: toDecimal(snapshot.incomeSubtotal),
    expenseSubtotal: toDecimal(snapshot.expenseSubtotal),
    creditCardSubtotal: toDecimal(snapshot.creditCardSubtotal),
    investmentSubtotal: toDecimal(snapshot.investmentSubtotal),
    taxSubtotal: toDecimal(snapshot.taxSubtotal),
    totalIncome: toDecimal(snapshot.totalIncome),
    totalExpenses: toDecimal(snapshot.totalExpenses),
    totalOutflows: toDecimal(snapshot.totalOutflows),
    finalBalance: toDecimal(snapshot.finalBalance),
    isConfirmed: true,
  };
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
  // TODO aporte sai da conta corrente no mês em que é feito — inclusive a
  // reserva de liquidez diária. Ela é resgatável a qualquer momento, mas o
  // dinheiro deixa o saldo na aplicação, e por isso o resgate devolve o valor
  // cheio como receita (ver redeem-investment.ts). `is_reserve` hoje só afeta
  // como o portfólio exibe a posição, não o cálculo do mês.
  const investmentSubtotal = sumAmounts(records.investments, investmentOutflow);

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
