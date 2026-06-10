import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryRecurringExpenseRepository } from '@/repositories/in-memory/in-memory-recurring-expense-repository'
import { ResourceNotFoundError } from './errors/resource-not-found-error'
import { InvalidEffectiveMonthError } from './errors/invalid-effective-month-error'
import { DeleteRecurringExpenseFromMonthService } from './delete-recurring-expense-from-month'

let repository: InMemoryRecurringExpenseRepository
let sut: DeleteRecurringExpenseFromMonthService

async function createTemplate() {
  return repository.create({
    name: 'Internet',
    amount: 120,
    paymentMethod: 'PIX',
    dayOfMonth: 10,
    startMonth: '03',
    startYear: 2026,
    userId: 'user-1',
  })
}

describe('Delete Recurring Expense From Month Service', () => {
  beforeEach(() => {
    repository = new InMemoryRecurringExpenseRepository()
    sut = new DeleteRecurringExpenseFromMonthService(repository)
  })

  it('removes the template entirely when deleting from the start month', async () => {
    const template = await createTemplate()

    await sut.execute({
      id: template.id,
      userId: 'user-1',
      effectiveMonth: '03',
      effectiveYear: 2026,
    })

    expect(repository.items).toHaveLength(0)
  })

  it('only closes the template when deleting from a later month', async () => {
    const template = await createTemplate()

    await sut.execute({
      id: template.id,
      userId: 'user-1',
      effectiveMonth: '08',
      effectiveYear: 2026,
    })

    const item = await repository.findById(template.id)
    expect(item).not.toBeNull()
    expect(item?.end_month).toBe('07')
    expect(item?.end_year).toBe(2026)
  })

  it('closes in december when deleting from january of the next year', async () => {
    const template = await createTemplate()

    await sut.execute({
      id: template.id,
      userId: 'user-1',
      effectiveMonth: '01',
      effectiveYear: 2027,
    })

    const item = await repository.findById(template.id)
    expect(item?.end_month).toBe('12')
    expect(item?.end_year).toBe(2026)
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
      }),
    ).rejects.toBeInstanceOf(InvalidEffectiveMonthError)

    const item = await repository.findById(template.id)
    expect(item?.end_month).toBe('03')
  })

  it('rejects deletes from another user', async () => {
    const template = await createTemplate()

    await expect(() =>
      sut.execute({
        id: template.id,
        userId: 'user-2',
        effectiveMonth: '03',
        effectiveYear: 2026,
      }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError)

    expect(repository.items).toHaveLength(1)
  })
})
