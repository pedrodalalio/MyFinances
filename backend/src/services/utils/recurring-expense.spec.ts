import { describe, expect, it } from 'vitest'
import { Prisma, RecurringExpense } from '@prisma/client'
import {
  isRecurringActive,
  previousMonth,
  toVirtualExpense,
} from './recurring-expense'

function makeRecurring(override: Partial<RecurringExpense> = {}): RecurringExpense {
  return {
    id: 'rec-1',
    name: 'Internet',
    description: null,
    amount: new Prisma.Decimal(120),
    payment_method: 'PIX',
    category: 'Casa',
    day_of_month: 10,
    start_month: '03',
    start_year: 2026,
    end_month: null,
    end_year: null,
    user_id: 'user-1',
    created_at: new Date(),
    updated_at: new Date(),
    ...override,
  }
}

describe('isRecurringActive', () => {
  it('is inactive before the start month', () => {
    expect(isRecurringActive(makeRecurring(), '02', 2026)).toBe(false)
    expect(isRecurringActive(makeRecurring(), '12', 2025)).toBe(false)
  })

  it('is active from the start month onwards when there is no end', () => {
    expect(isRecurringActive(makeRecurring(), '03', 2026)).toBe(true)
    expect(isRecurringActive(makeRecurring(), '12', 2026)).toBe(true)
    expect(isRecurringActive(makeRecurring(), '01', 2030)).toBe(true)
  })

  it('treats the end month as inclusive', () => {
    const recurring = makeRecurring({ end_month: '06', end_year: 2026 })

    expect(isRecurringActive(recurring, '06', 2026)).toBe(true)
    expect(isRecurringActive(recurring, '07', 2026)).toBe(false)
  })

  it('handles windows that cross a year boundary', () => {
    const recurring = makeRecurring({
      start_month: '11',
      start_year: 2026,
      end_month: '02',
      end_year: 2027,
    })

    expect(isRecurringActive(recurring, '10', 2026)).toBe(false)
    expect(isRecurringActive(recurring, '01', 2027)).toBe(true)
    expect(isRecurringActive(recurring, '03', 2027)).toBe(false)
  })
})

describe('toVirtualExpense', () => {
  it('builds a deterministic virtual id and carries the recurring flags', () => {
    const virtual = toVirtualExpense(makeRecurring(), '05', 2026)

    expect(virtual.id).toBe('rec_rec-1_202605')
    expect(virtual.is_recurring).toBe(true)
    expect(virtual.recurring_id).toBe('rec-1')
    expect(virtual.month).toBe('05')
    expect(virtual.year).toBe(2026)
  })

  it('uses the configured day of month when it exists in the month', () => {
    const virtual = toVirtualExpense(makeRecurring({ day_of_month: 31 }), '01', 2026)

    expect(virtual.date.getUTCDate()).toBe(31)
  })

  it('falls back to the last day of shorter months', () => {
    const virtualFeb = toVirtualExpense(makeRecurring({ day_of_month: 31 }), '02', 2026)
    const virtualApr = toVirtualExpense(makeRecurring({ day_of_month: 31 }), '04', 2026)
    const virtualFebLeap = toVirtualExpense(makeRecurring({ day_of_month: 31 }), '02', 2028)

    expect(virtualFeb.date.getUTCDate()).toBe(28)
    expect(virtualApr.date.getUTCDate()).toBe(30)
    expect(virtualFebLeap.date.getUTCDate()).toBe(29)
  })
})

describe('previousMonth', () => {
  it('returns the previous month zero-padded', () => {
    expect(previousMonth('03', 2026)).toEqual({ month: '02', year: 2026 })
    expect(previousMonth('12', 2026)).toEqual({ month: '11', year: 2026 })
  })

  it('rolls back to december of the previous year', () => {
    expect(previousMonth('01', 2026)).toEqual({ month: '12', year: 2025 })
  })
})
