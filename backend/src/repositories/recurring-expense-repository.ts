import { RecurringExpense, PaymentMethod } from '@prisma/client'

export interface CreateRecurringExpenseData {
  name: string
  description?: string
  amount: number
  paymentMethod: PaymentMethod
  category?: string
  dayOfMonth: number
  startMonth: string
  startYear: number
  endMonth?: string | null
  endYear?: number | null
  userId: string
}

export interface UpdateRecurringExpenseData {
  id: string
  name?: string
  description?: string
  amount?: number
  paymentMethod?: PaymentMethod
  category?: string
  dayOfMonth?: number
  startMonth?: string
  startYear?: number
  endMonth?: string | null
  endYear?: number | null
}

export interface RecurringExpenseRepository {
  create(data: CreateRecurringExpenseData): Promise<RecurringExpense>
  findManyByUser(userId: string): Promise<RecurringExpense[]>
  findById(id: string): Promise<RecurringExpense | null>
  update(data: UpdateRecurringExpenseData): Promise<RecurringExpense>
  delete(id: string): Promise<void>
  /**
   * Versionamento atômico: fecha o template `closeId` em `end` e cria a nova
   * versão em uma única transação, para nunca deixar o gasto fixo truncado
   * sem a versão seguinte.
   */
  closeAndCreateNext(
    closeId: string,
    end: { month: string; year: number },
    create: CreateRecurringExpenseData,
  ): Promise<RecurringExpense>
}
