import { Prisma, CreditCardPurchase, CreditCardInstallment } from "@prisma/client";

export interface InstallmentRowForPurchase {
  purchase_name: string
  installment_amount: number
  current_installment: number
  total_installments: number
  month: string
  year: number
}

export interface CreditCardPurchasesRepository {
  create(data: Prisma.CreditCardPurchaseCreateInput): Promise<CreditCardPurchase>
  /**
   * Cria a compra e todas as parcelas em uma única transação, para não deixar
   * compra órfã (sem parcelas) se algo falhar no meio.
   */
  createWithInstallments(
    data: Prisma.CreditCardPurchaseUncheckedCreateInput,
    installments: InstallmentRowForPurchase[],
  ): Promise<CreditCardPurchase & { installments_data: CreditCardInstallment[] }>
  findManyByUser(userId: string): Promise<CreditCardPurchase[]>
  findById(id: string): Promise<CreditCardPurchase | null>
  update(id: string, data: Prisma.CreditCardPurchaseUpdateInput): Promise<CreditCardPurchase>
  delete(id: string): Promise<void>
}