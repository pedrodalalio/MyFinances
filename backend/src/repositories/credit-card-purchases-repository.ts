import { Prisma, CreditCardPurchase } from "@prisma/client";

export interface CreditCardPurchasesRepository {
  create(data: Prisma.CreditCardPurchaseCreateInput): Promise<CreditCardPurchase>
  findManyByUser(userId: string): Promise<CreditCardPurchase[]>
  findById(id: string): Promise<CreditCardPurchase | null>
  update(id: string, data: Prisma.CreditCardPurchaseUpdateInput): Promise<CreditCardPurchase>
  delete(id: string): Promise<void>
}