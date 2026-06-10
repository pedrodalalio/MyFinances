import { Expense, RecurringExpense } from '@prisma/client'

/**
 * Janela de vigência mensal. Cobre tanto gastos fixos (RecurringExpense)
 * quanto compras recorrentes do cartão (CreditCardPurchase), que compartilham
 * o mesmo formato de start/end.
 */
export interface MonthlyRecurrence {
  start_month: string
  start_year: number
  end_month: string | null
  end_year: number | null
}

/**
 * Verifica se uma recorrência está ativa num determinado mês/ano.
 * Janela inclusiva: ativo se start <= mês <= end (ou sem end).
 */
export function isRecurringActive(
  recurring: MonthlyRecurrence,
  month: string,
  year: number,
): boolean {
  const startDate = new Date(recurring.start_year, parseInt(recurring.start_month) - 1)
  const requestedDate = new Date(year, parseInt(month) - 1)

  if (startDate > requestedDate) return false

  if (recurring.end_month && recurring.end_year) {
    const endDate = new Date(recurring.end_year, parseInt(recurring.end_month) - 1)
    if (endDate < requestedDate) return false
  }

  return true
}

export type VirtualExpense = Expense & {
  is_recurring: boolean
  recurring_id: string
  recurring_end_month: string | null
  recurring_end_year: number | null
}

/**
 * Expande um gasto fixo numa linha "virtual" no formato Expense para o mês pedido.
 * O id virtual é determinístico (rec_<id>_<ano><mes>) e carrega flags para o
 * frontend rotear edição/exclusão para os endpoints de gasto fixo.
 */
export function toVirtualExpense(
  recurring: RecurringExpense,
  month: string,
  year: number,
): VirtualExpense {
  // Dia 29-31 em meses mais curtos cai no último dia do mês (ex.: dia 31 em
  // fevereiro vira 28/29), comportamento padrão de cobranças recorrentes.
  const daysInMonth = new Date(year, parseInt(month), 0).getDate()
  const day = Math.min(Math.max(recurring.day_of_month, 1), daysInMonth)

  return {
    id: `rec_${recurring.id}_${year}${month}`,
    name: recurring.name,
    description: recurring.description,
    amount: recurring.amount,
    payment_method: recurring.payment_method,
    category: recurring.category,
    month,
    year,
    date: new Date(Date.UTC(year, parseInt(month) - 1, day, 12)),
    user_id: recurring.user_id,
    created_at: recurring.created_at,
    updated_at: recurring.updated_at,
    is_recurring: true,
    recurring_id: recurring.id,
    recurring_end_month: recurring.end_month,
    recurring_end_year: recurring.end_year,
  }
}

/**
 * Retorna o mês/ano imediatamente anterior ao informado.
 * Ex.: (01, 2026) -> (12, 2025).
 */
export function previousMonth(
  month: string,
  year: number,
): { month: string; year: number } {
  const m = parseInt(month)
  if (m === 1) {
    return { month: '12', year: year - 1 }
  }
  return { month: (m - 1).toString().padStart(2, '0'), year }
}
