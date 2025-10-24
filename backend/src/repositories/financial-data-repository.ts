import { Prisma, FinancialData } from "@prisma/client";

export interface FinancialDataRepository {
  findByUserAndPeriod(userId: string, month: string, year: number): Promise<FinancialData | null>
  create(data: Prisma.FinancialDataUncheckedCreateInput): Promise<FinancialData>
  update(id: string, data: Prisma.FinancialDataUpdateInput): Promise<FinancialData>
  updateCreditCardSubtotal(id: string, creditCardSubtotal: number): Promise<FinancialData>
  findManyByUser(userId: string): Promise<FinancialData[]>
  delete(id: string): Promise<void>
}