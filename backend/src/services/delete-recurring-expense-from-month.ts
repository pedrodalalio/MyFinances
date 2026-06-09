import { RecurringExpenseRepository } from '@/repositories/recurring-expense-repository'
import { ResourceNotFoundError } from './errors/resource-not-found-error'
import { previousMonth } from './utils/recurring-expense'

interface DeleteRecurringExpenseFromMonthServiceRequest {
  id: string
  userId: string
  effectiveMonth: string
  effectiveYear: number
}

export class DeleteRecurringExpenseFromMonthService {
  constructor(private recurringExpenseRepository: RecurringExpenseRepository) {}

  async execute(data: DeleteRecurringExpenseFromMonthServiceRequest): Promise<void> {
    const existing = await this.recurringExpenseRepository.findById(data.id)

    if (!existing || existing.user_id !== data.userId) {
      throw new ResourceNotFoundError()
    }

    const startDate = new Date(existing.start_year, parseInt(existing.start_month) - 1)
    const effectiveDate = new Date(data.effectiveYear, parseInt(data.effectiveMonth) - 1)

    // Excluir a partir do início (ou antes): remove o gasto fixo por completo.
    if (effectiveDate <= startDate) {
      await this.recurringExpenseRepository.delete(existing.id)
      return
    }

    // Excluir a partir de um mês posterior: encerra a vigência no mês anterior,
    // preservando os meses já decorridos.
    const prev = previousMonth(data.effectiveMonth, data.effectiveYear)

    await this.recurringExpenseRepository.update({
      id: existing.id,
      endMonth: prev.month,
      endYear: prev.year,
    })
  }
}
