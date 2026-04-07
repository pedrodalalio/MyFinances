import { FinancialDataRepository } from "@/repositories/financial-data-repository";
import { SalaryProfilesRepository } from "@/repositories/salary-profiles-repository";
import { CreditCardInstallmentsRepository } from "@/repositories/credit-card-installments-repository";
import { CreditCardPurchasesRepository } from "@/repositories/credit-card-purchases-repository";
import { ExpenseRepository } from "@/repositories/expense-repository";
import { IncomeRepository } from "@/repositories/income-repository";
import { InvestmentRepository } from "@/repositories/investment-repository";
import { TaxRepository } from "@/repositories/tax-repository";
import { ResourceNotFoundError } from "./errors/resource-not-found-error";

interface ConfirmMonthServiceRequest {
  userId: string;
  month: string;
  year: number;
}

export class ConfirmMonthService {
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

  async execute({
    userId,
    month,
    year,
  }: ConfirmMonthServiceRequest): Promise<void> {
    // Buscar dados financeiros do mês atual
    const currentMonthData =
      await this.financialDataRepository.findByUserAndPeriod(
        userId,
        month,
        year,
      );

    if (!currentMonthData) {
      throw new ResourceNotFoundError();
    }

    // Buscar salário atual
    const currentSalary =
      await this.salaryProfilesRepository.findCurrentByUser(userId);

    // Buscar gastos reais do mês (mesma lógica do financial-overview)
    const installments =
      await this.creditCardInstallmentsRepository.findManyByUserAndPeriod(
        userId,
        month,
        year,
      );
    const recurringPurchases =
      await this.creditCardPurchasesRepository.findManyByUser(userId);
    const expenses = await this.expenseRepository.findByMonthAndUser(
      userId,
      month,
      year,
    );
    const incomes = await this.incomeRepository.findByMonthAndUser(
      userId,
      month,
      year,
    );
    const monthlyInvestments =
      await this.investmentRepository.findByMonthAndUser(
        userId,
        month,
        year,
      );
    const taxes = await this.taxRepository.findByMonthAndUser(
      userId,
      month,
      year,
    );

    // Calcular gastos reais
    const activeRecurringPurchases = recurringPurchases.filter((purchase) => {
      if (!purchase.is_recurring) return false;
      const startDate = new Date(
        purchase.start_year,
        parseInt(purchase.start_month) - 1,
      );
      const requestedDate = new Date(year, parseInt(month) - 1);
      if (startDate > requestedDate) return false;
      if (purchase.end_month && purchase.end_year) {
        const endDate = new Date(
          purchase.end_year,
          parseInt(purchase.end_month) - 1,
        );
        if (endDate < requestedDate) return false;
      }
      return true;
    });

    const installmentsTotal = installments.reduce(
      (sum, inst) => sum + Number(inst.installment_amount),
      0,
    );
    const recurringTotal = activeRecurringPurchases.reduce(
      (sum, purchase) => sum + Number(purchase.installment_amount),
      0,
    );
    const realCreditCardTotal = installmentsTotal + recurringTotal;
    const realExpensesTotal = expenses.reduce(
      (sum, expense) => sum + Number(expense.amount),
      0,
    );
    const realInvestmentsTotal = monthlyInvestments.reduce(
      (sum, investment) => {
        const amount = Number(investment.amount)
        const qty = investment.quantity ? Number(investment.quantity) : 1
        return sum + (investment.investment_type === 'ETF' ? amount * qty : amount)
      },
      0,
    );
    const realTaxesTotal = taxes.reduce(
      (sum, tax) => sum + Number(tax.amount),
      0,
    );

    // Calcular total das entradas extras
    const realIncomesTotal = incomes.reduce(
      (sum, income) => sum + Number(income.amount),
      0,
    );

    // Calcular receita total real
    const mainIncome = Number(currentMonthData.main_income);
    const checkingAccount = Number(currentMonthData.checking_account);
    const previousBalance = Number(currentMonthData.previous_balance);
    const salaryAmount = currentSalary
      ? Number(currentSalary.amount)
      : mainIncome;
    const totalIncome = salaryAmount + checkingAccount + previousBalance + realIncomesTotal;

    // Calcular gastos totais reais
    const totalExpenses =
      realExpensesTotal +
      realCreditCardTotal +
      realTaxesTotal;

    // Calcular saldo final real (investimentos saem da conta corrente)
    const finalBalance = totalIncome - totalExpenses - realInvestmentsTotal;

    // Calcular próximo mês e ano
    const currentMonthInt = parseInt(month);
    const nextMonth = currentMonthInt === 12 ? 1 : currentMonthInt + 1;
    const nextYear = currentMonthInt === 12 ? year + 1 : year;
    const nextMonthStr = nextMonth.toString().padStart(2, "0");

    let nextMonthData = await this.financialDataRepository.findByUserAndPeriod(
      userId,
      nextMonthStr,
      nextYear,
    );

    if (nextMonthData) {
      // Se já existe, atualizar o previous_balance
      await this.financialDataRepository.update(nextMonthData.id, {
        previous_balance: finalBalance,
      });
    } else {
      // Se não existe, criar dados para o próximo mês
      await this.financialDataRepository.create({
        user_id: userId,
        month: nextMonthStr,
        year: nextYear,
        main_income: 0,
        checking_account: 0,
        previous_balance: finalBalance,
        total_in_account: 0,
      });
    }

    // Marcar o mês atual como confirmado
    await this.financialDataRepository.update(currentMonthData.id, {
      is_confirmed: true,
    });
  }
}
