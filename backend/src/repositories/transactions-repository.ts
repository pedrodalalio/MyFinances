import { Prisma, Transaction } from "@prisma/client";

export interface TransactionsRepository {
  create(data: Prisma.TransactionCreateInput): Promise<Transaction>
  findManyByFinancialData(financialDataId: string): Promise<Transaction[]>
  update(id: string, data: Prisma.TransactionUpdateInput): Promise<Transaction>
  delete(id: string): Promise<void>
  findById(id: string): Promise<Transaction | null>
}