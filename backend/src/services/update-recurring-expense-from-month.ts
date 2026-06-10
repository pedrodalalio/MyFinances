import { PaymentMethod, RecurringExpense } from '@prisma/client'
import { RecurringExpenseRepository } from '@/repositories/recurring-expense-repository'
import { ResourceNotFoundError } from './errors/resource-not-found-error'
import { InvalidEffectiveMonthError } from './errors/invalid-effective-month-error'
import { previousMonth } from './utils/recurring-expense'

interface UpdateRecurringExpenseFromMonthServiceRequest {
  id: string
  userId: string
  effectiveMonth: string
  effectiveYear: number
  name?: string
  description?: string
  amount?: number
  paymentMethod?: PaymentMethod
  category?: string
  dayOfMonth?: number
}

interface UpdateRecurringExpenseFromMonthServiceResponse {
  recurringExpense: RecurringExpense
}

export class UpdateRecurringExpenseFromMonthService {
  constructor(private recurringExpenseRepository: RecurringExpenseRepository) {}

  async execute(
    data: UpdateRecurringExpenseFromMonthServiceRequest,
  ): Promise<UpdateRecurringExpenseFromMonthServiceResponse> {
    const existing = await this.recurringExpenseRepository.findById(data.id)

    if (!existing || existing.user_id !== data.userId) {
      throw new ResourceNotFoundError()
    }

    const fields = {
      name: data.name,
      description: data.description,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      category: data.category,
      dayOfMonth: data.dayOfMonth,
    }

    const startDate = new Date(existing.start_year, parseInt(existing.start_month) - 1)
    const effectiveDate = new Date(data.effectiveYear, parseInt(data.effectiveMonth) - 1)

    // Mês efetivo após o fim da vigência reabriria/estenderia um template já
    // encerrado e criaria uma versão com janela invertida — rejeitar.
    if (existing.end_month && existing.end_year) {
      const endDate = new Date(existing.end_year, parseInt(existing.end_month) - 1)
      if (effectiveDate > endDate) {
        throw new InvalidEffectiveMonthError()
      }
    }

    // Editar a partir do próprio início (ou antes): atualiza o template no lugar.
    if (effectiveDate <= startDate) {
      const recurringExpense = await this.recurringExpenseRepository.update({
        id: existing.id,
        ...fields,
      })

      return { recurringExpense }
    }

    // Editar a partir de um mês posterior: fecha o template atual no mês anterior
    // ao efetivo e cria um novo template (versão) a partir do mês efetivo,
    // preservando o histórico dos meses anteriores. Atômico via transação.
    const prev = previousMonth(data.effectiveMonth, data.effectiveYear)

    const recurringExpense = await this.recurringExpenseRepository.closeAndCreateNext(
      existing.id,
      { month: prev.month, year: prev.year },
      {
        name: fields.name ?? existing.name,
        description: fields.description ?? existing.description ?? undefined,
        amount: fields.amount ?? Number(existing.amount),
        paymentMethod: fields.paymentMethod ?? existing.payment_method,
        category: fields.category ?? existing.category ?? undefined,
        dayOfMonth: fields.dayOfMonth ?? existing.day_of_month,
        startMonth: data.effectiveMonth,
        startYear: data.effectiveYear,
        endMonth: existing.end_month,
        endYear: existing.end_year,
        userId: data.userId,
      },
    )

    return { recurringExpense }
  }
}
