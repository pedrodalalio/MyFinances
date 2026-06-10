import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryRecurringExpenseRepository } from '@/repositories/in-memory/in-memory-recurring-expense-repository'
import { ResourceNotFoundError } from './errors/resource-not-found-error'
import { InvalidEffectiveMonthError } from './errors/invalid-effective-month-error'
import { UpdateRecurringExpenseFromMonthService } from './update-recurring-expense-from-month'

let repository: InMemoryRecurringExpenseRepository
let sut: UpdateRecurringExpenseFromMonthService

async function createTemplate() {
  return repository.create({
    name: 'Internet',
    description: 'Fibra 500mb',
    amount: 120,
    paymentMethod: 'PIX',
    category: 'Casa',
    dayOfMonth: 10,
    startMonth: '03',
    startYear: 2026,
    userId: 'user-1',
  })
}

describe('Update Recurring Expense From Month Service', () => {
  beforeEach(() => {
    repository = new InMemoryRecurringExpenseRepository()
    sut = new UpdateRecurringExpenseFromMonthService(repository)
  })

  it('updates the template in place when editing from the start month', async () => {
    const template = await createTemplate()

    const { recurringExpense } = await sut.execute({
      id: template.id,
      userId: 'user-1',
      effectiveMonth: '03',
      effectiveYear: 2026,
      amount: 150,
    })

    expect(repository.items).toHaveLength(1)
    expect(recurringExpense.id).toBe(template.id)
    expect(Number(recurringExpense.amount)).toBe(150)
    expect(recurringExpense.end_month).toBeNull()
  })

  it('versions the template when editing from a later month', async () => {
    const template = await createTemplate()

    const { recurringExpense } = await sut.execute({
      id: template.id,
      userId: 'user-1',
      effectiveMonth: '06',
      effectiveYear: 2026,
      amount: 150,
    })

    expect(repository.items).toHaveLength(2)

    const original = await repository.findById(template.id)
    expect(original?.end_month).toBe('05')
    expect(original?.end_year).toBe(2026)
    expect(Number(original?.amount)).toBe(120)

    expect(recurringExpense.id).not.toBe(template.id)
    expect(recurringExpense.start_month).toBe('06')
    expect(recurringExpense.start_year).toBe(2026)
    expect(recurringExpense.end_month).toBeNull()
    expect(Number(recurringExpense.amount)).toBe(150)
    // Campos não enviados são herdados do template original
    expect(recurringExpense.name).toBe('Internet')
    expect(recurringExpense.day_of_month).toBe(10)
  })

  it('closes the previous version in december when editing from january', async () => {
    const template = await createTemplate()

    await sut.execute({
      id: template.id,
      userId: 'user-1',
      effectiveMonth: '01',
      effectiveYear: 2027,
      amount: 150,
    })

    const original = await repository.findById(template.id)
    expect(original?.end_month).toBe('12')
    expect(original?.end_year).toBe(2026)
  })

  it('preserves the original end when versioning a template that already has one', async () => {
    const template = await repository.create({
      name: 'Aluguel',
      amount: 1500,
      paymentMethod: 'PIX',
      dayOfMonth: 5,
      startMonth: '01',
      startYear: 2026,
      endMonth: '12',
      endYear: 2026,
      userId: 'user-1',
    })

    const { recurringExpense } = await sut.execute({
      id: template.id,
      userId: 'user-1',
      effectiveMonth: '07',
      effectiveYear: 2026,
      amount: 1600,
    })

    expect(recurringExpense.end_month).toBe('12')
    expect(recurringExpense.end_year).toBe(2026)
  })

  it('rejects an effective month after the template end', async () => {
    const template = await repository.create({
      name: 'Aluguel',
      amount: 1500,
      paymentMethod: 'PIX',
      dayOfMonth: 5,
      startMonth: '01',
      startYear: 2026,
      endMonth: '03',
      endYear: 2026,
      userId: 'user-1',
    })

    await expect(() =>
      sut.execute({
        id: template.id,
        userId: 'user-1',
        effectiveMonth: '06',
        effectiveYear: 2026,
        amount: 1600,
      }),
    ).rejects.toBeInstanceOf(InvalidEffectiveMonthError)

    // Nada foi alterado nem criado
    const original = await repository.findById(template.id)
    expect(original?.end_month).toBe('03')
    expect(repository.items).toHaveLength(1)
  })

  it('rejects updates from another user', async () => {
    const template = await createTemplate()

    await expect(() =>
      sut.execute({
        id: template.id,
        userId: 'user-2',
        effectiveMonth: '03',
        effectiveYear: 2026,
        amount: 150,
      }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError)
  })

  it('rejects updates to a missing template', async () => {
    await expect(() =>
      sut.execute({
        id: 'does-not-exist',
        userId: 'user-1',
        effectiveMonth: '03',
        effectiveYear: 2026,
      }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError)
  })
})
