import { Transaction, TransactionType } from "@prisma/client";
import { FinancialDataRepository } from "@/repositories/financial-data-repository";
import { TransactionsRepository } from "@/repositories/transactions-repository";
import { ResourceNotFoundError } from "./errors/resource-not-found-error";

interface AddTransactionServiceRequest {
  userId: string;
  month: string;
  year: number;
  name: string;
  actualCost: number;
  type: TransactionType;
}

interface AddTransactionServiceResponse {
  transaction: Transaction;
}

export class AddTransactionService {
  constructor(
    private financialDataRepository: FinancialDataRepository,
    private transactionsRepository: TransactionsRepository
  ) {}

  async execute({
    userId,
    month,
    year,
    name,
    actualCost,
    type
  }: AddTransactionServiceRequest): Promise<AddTransactionServiceResponse> {

    // Find or create financial data for the period
    let financialData = await this.financialDataRepository.findByUserAndPeriod(userId, month, year);

    if (!financialData) {
      financialData = await this.financialDataRepository.create({
        month,
        year,
        user: {
          connect: { id: userId }
        }
      });
    }

    // Create the transaction
    const difference = -actualCost; // Expenses are negative
    const transaction = await this.transactionsRepository.create({
      name,
      actual_cost: actualCost,
      difference,
      type,
      financialData: {
        connect: { id: financialData.id }
      }
    });

    // Recalculate totals
    await this.recalculateTotals(financialData.id);

    return { transaction };
  }

  private async recalculateTotals(financialDataId: string) {
    // Get fresh data with includes
    const financialData = await this.financialDataRepository.findByUserAndPeriod("", "", 0);

    if (!financialData) {
      throw new ResourceNotFoundError();
    }

    const transactions = financialData.transactions || [];
    const investments = financialData.investments || [];

    // Calculate subtotals by type
    const expenseSubtotal = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.actual_cost), 0);

    const creditCardSubtotal = transactions
      .filter(t => t.type === 'CREDIT_CARD')
      .reduce((sum, t) => sum + Number(t.actual_cost), 0);

    const taxSubtotal = transactions
      .filter(t => t.type === 'TAX')
      .reduce((sum, t) => sum + Number(t.actual_cost), 0);

    const investmentSubtotal = investments
      .reduce((sum, i) => sum + Number(i.balance), 0);

    // Calculate totals
    const totalIncome = Number(financialData.main_income) + Number(financialData.checking_account);
    const totalExpenses = -(expenseSubtotal + creditCardSubtotal + taxSubtotal);
    const finalBalance = totalIncome + totalExpenses;
    const expectedTotalMoney = investmentSubtotal + finalBalance;

    // Update in database
    await this.financialDataRepository.update(financialDataId, {
      expense_subtotal: -expenseSubtotal,
      credit_card_subtotal: -creditCardSubtotal,
      tax_subtotal: -taxSubtotal,
      investment_subtotal: investmentSubtotal,
      total_income: totalIncome,
      total_expenses: totalExpenses,
      final_balance: finalBalance,
      expected_total_money: expectedTotalMoney
    });
  }
}