import { Prisma, FinancialData } from "@prisma/client";

export interface FinancialDataRepository {
  findByUserAndPeriod(userId: string, month: string, year: number): Promise<FinancialData | null>
  create(data: Prisma.FinancialDataUncheckedCreateInput): Promise<FinancialData>
  upsert(userId: string, month: string, year: number, data: Prisma.FinancialDataUncheckedCreateInput): Promise<FinancialData>
  update(id: string, data: Prisma.FinancialDataUpdateInput): Promise<FinancialData>
  updateCreditCardSubtotal(id: string, creditCardSubtotal: Prisma.Decimal | number): Promise<FinancialData>
  findManyByUser(userId: string): Promise<FinancialData[]>
  delete(id: string): Promise<void>
  /**
   * Marca o mês `currentId` como confirmado, grava o snapshot de fechamento
   * (congela o mês) e o previous_balance do mês seguinte (criando-o se não
   * existir) em uma única transação.
   */
  confirmAndCarryOver(
    currentId: string,
    closingSnapshot: Prisma.InputJsonValue,
    next: { userId: string; month: string; year: number; previousBalance: Prisma.Decimal | number },
  ): Promise<void>
}