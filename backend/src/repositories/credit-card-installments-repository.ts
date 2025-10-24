import { Prisma, CreditCardInstallment } from "@prisma/client";

export interface CreditCardInstallmentsRepository {
  create(data: Prisma.CreditCardInstallmentCreateInput): Promise<CreditCardInstallment>
  findManyByPurchase(purchaseId: string): Promise<CreditCardInstallment[]>
  findManyByPeriod(month: string, year: number): Promise<CreditCardInstallment[]>
  findManyByUserAndPeriod(userId: string, month: string, year: number): Promise<CreditCardInstallment[]>
  findById(id: string): Promise<CreditCardInstallment | null>
  update(id: string, installmentAmount: number): Promise<CreditCardInstallment>
  delete(id: string): Promise<void>
  deleteByPurchaseId(purchaseId: string): Promise<void>
}