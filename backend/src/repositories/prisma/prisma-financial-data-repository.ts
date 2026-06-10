import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { FinancialDataRepository } from "../financial-data-repository";

export class PrismaFinancialDataRepository implements FinancialDataRepository {
  async findByUserAndPeriod(userId: string, month: string, year: number) {
    const financialData = await prisma.financialData.findUnique({
      where: {
        user_id_month_year: {
          user_id: userId,
          month,
          year,
        },
      },
      include: {
        transactions: true,
      },
    });

    return financialData;
  }

  async create(data: Prisma.FinancialDataUncheckedCreateInput) {
    const financialData = await prisma.financialData.create({
      data,
      include: {
        transactions: true,
      },
    });

    return financialData;
  }

  async upsert(userId: string, month: string, year: number, data: Prisma.FinancialDataUncheckedCreateInput) {
    const financialData = await prisma.financialData.upsert({
      where: {
        user_id_month_year: {
          user_id: userId,
          month,
          year,
        },
      },
      create: data,
      update: {},
      include: {
        transactions: true,
      },
    });

    return financialData;
  }

  async update(id: string, data: Prisma.FinancialDataUpdateInput) {
    const financialData = await prisma.financialData.update({
      where: { id },
      data,
      include: {
        transactions: true,
      },
    });

    return financialData;
  }

  async findManyByUser(userId: string) {
    const financialData = await prisma.financialData.findMany({
      where: {
        user_id: userId,
      },
      include: {
        transactions: true,
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    return financialData;
  }

  async updateCreditCardSubtotal(id: string, creditCardSubtotal: number) {
    // Buscar dados atuais
    const currentData = await prisma.financialData.findUnique({
      where: { id },
    });

    if (!currentData) {
      throw new Error("FinancialData not found");
    }
    const newTotalExpenses =
      Number(currentData.expense_subtotal) +
      creditCardSubtotal +
      Number(currentData.tax_subtotal);

    const updatedFinancialData = await prisma.financialData.update({
      where: { id },
      data: {
        credit_card_subtotal: creditCardSubtotal,
        total_expenses: newTotalExpenses,
      },
    });

    return updatedFinancialData;
  }

  async delete(id: string) {
    await prisma.financialData.delete({
      where: { id },
    });
  }

  async confirmAndCarryOver(
    currentId: string,
    next: { userId: string; month: string; year: number; previousBalance: number },
  ) {
    await prisma.$transaction([
      prisma.financialData.update({
        where: { id: currentId },
        data: { is_confirmed: true },
      }),
      prisma.financialData.upsert({
        where: {
          user_id_month_year: {
            user_id: next.userId,
            month: next.month,
            year: next.year,
          },
        },
        create: {
          user_id: next.userId,
          month: next.month,
          year: next.year,
          main_income: 0,
          checking_account: 0,
          previous_balance: next.previousBalance,
          total_in_account: 0,
        },
        update: {
          previous_balance: next.previousBalance,
        },
      }),
    ]);
  }
}
