import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Investment, Prisma } from '@prisma/client'
import { CreateIncomeData, IncomeRepository } from '@/repositories/income-repository'
import { InvestmentRepository, UpdateInvestmentData } from '@/repositories/investment-repository'
import { RedeemInvestmentService, PARTIAL_NOT_SUPPORTED_MESSAGE } from './redeem-investment'

// O service grava o snapshot direto via prisma; aqui só interessa o que ele
// registraria, então o client vira um espião.
const snapshotCreate = vi.fn()
vi.mock('@/lib/prisma', () => ({
  prisma: { investmentSnapshot: { create: (args: unknown) => snapshotCreate(args) } },
}))

let incomes: CreateIncomeData[]
let updates: UpdateInvestmentData[]
let stored: Investment

function makeInvestment(over: Partial<Investment> = {}): Investment {
  return {
    id: 'inv-1',
    name: 'CDB PagBank Liquidez Diária 103%',
    description: null,
    amount: new Prisma.Decimal(10000),
    gross_yield: new Prisma.Decimal(10600),
    net_value: new Prisma.Decimal(10500),
    investment_type: 'CDB',
    category: null,
    date: new Date('2026-01-10T12:00:00Z'),
    purchase_date: new Date('2026-01-10T12:00:00Z'),
    maturity_date: null,
    interest_rate: null,
    quantity: null,
    broker: 'PagBank',
    ticker: null,
    dividend_yield: null,
    status: 'ACTIVE',
    is_reserve: true,
    notes: null,
    user_id: 'user-1',
    created_at: new Date(),
    updated_at: new Date(),
    ...over,
  } as Investment
}

function makeService(investment: Investment) {
  stored = investment
  const investmentRepository = {
    findById: async () => stored,
    update: async (data: UpdateInvestmentData) => {
      updates.push(data)
      return { ...stored, ...data } as unknown as Investment
    },
  } as unknown as InvestmentRepository

  const incomeRepository = {
    create: async (data: CreateIncomeData) => {
      incomes.push(data)
      return data as never
    },
  } as unknown as IncomeRepository

  return new RedeemInvestmentService(investmentRepository, incomeRepository)
}

const redeemDate = new Date('2026-08-13T12:00:00Z')

describe('RedeemInvestmentService', () => {
  beforeEach(() => {
    incomes = []
    updates = []
    snapshotCreate.mockClear()
  })

  it('no resgate parcial tira o principal proporcional e mantém a aplicação ativa', async () => {
    const sut = makeService(makeInvestment())

    // Posição: 10.000 aplicados valendo 10.500. Sacando 2.100 (20% da posição)
    // saem 2.000 de principal e 100 de rendimento.
    const { outcome } = await sut.execute({
      investmentId: 'inv-1',
      userId: 'user-1',
      finalValue: 2100,
      redeemDate,
      partial: true,
    })

    expect(outcome.partial).toBe(true)
    expect(outcome.principalWithdrawn).toBe(2000)
    expect(outcome.yieldWithdrawn).toBe(100)
    expect(outcome.remainingAmount).toBe(8000)
    expect(outcome.remainingNetValue).toBe(8400)

    expect(updates[0]).toMatchObject({ amount: 8000, netValue: 8400, grossYield: 8480 })
    expect(updates[0].status).toBeUndefined()
  })

  it('em reserva a entrada também é o valor cheio, principal incluído', async () => {
    const sut = makeService(makeInvestment())

    await sut.execute({
      investmentId: 'inv-1',
      userId: 'user-1',
      finalValue: 2100,
      redeemDate,
      partial: true,
    })

    // O aporte da reserva saiu do saldo no mês da aplicação (month-summary
    // conta todo investimento como saída), então o principal que volta é
    // dinheiro entrando de novo — não duplicata.
    expect(incomes).toHaveLength(1)
    expect(incomes[0]).toMatchObject({ amount: 2100, month: '08', year: 2026 })
  })

  it('fora da reserva a entrada é o valor cheio resgatado', async () => {
    const sut = makeService(makeInvestment({ is_reserve: false }))

    await sut.execute({
      investmentId: 'inv-1',
      userId: 'user-1',
      finalValue: 2100,
      redeemDate,
      partial: true,
    })

    expect(incomes[0]).toMatchObject({ amount: 2100 })
  })

  it('resgate total encerra a aplicação e zera o que sobra', async () => {
    const sut = makeService(makeInvestment({ is_reserve: false }))

    const { outcome } = await sut.execute({
      investmentId: 'inv-1',
      userId: 'user-1',
      finalValue: 10500,
      redeemDate,
    })

    expect(outcome.partial).toBe(false)
    expect(outcome.yieldWithdrawn).toBe(500)
    expect(updates[0]).toMatchObject({ status: 'MATURED', netValue: 10500, grossYield: 10500 })
  })

  it('parcial que consome a posição inteira vira resgate total', async () => {
    const sut = makeService(makeInvestment({ is_reserve: false }))

    const { outcome } = await sut.execute({
      investmentId: 'inv-1',
      userId: 'user-1',
      finalValue: 10500,
      redeemDate,
      partial: true,
    })

    expect(outcome.partial).toBe(false)
    expect(updates[0]).toMatchObject({ status: 'MATURED' })
  })

  it('sem rendimento acompanhado, o saque entra como principal puro', async () => {
    // Sem valor atual registrado a posição vale o aplicado: os 3.000 sacados
    // são todos principal, e mesmo assim entram como receita do mês.
    const sut = makeService(makeInvestment({ gross_yield: null, net_value: null }))

    const { outcome } = await sut.execute({
      investmentId: 'inv-1',
      userId: 'user-1',
      finalValue: 3000,
      redeemDate,
      partial: true,
    })

    expect(outcome.yieldWithdrawn).toBe(0)
    expect(incomes[0]).toMatchObject({ amount: 3000 })
    expect(updates[0]).toMatchObject({ amount: 7000 })
  })

  it('usa o valor informado no resgate, não o rendimento defasado', async () => {
    // Registro diz 10.500, mas na hora do saque a aplicação vale 10.800.
    // Sacando 2.100 a fatia real é 19,44% — não os 20% do valor velho.
    const sut = makeService(makeInvestment())

    const { outcome } = await sut.execute({
      investmentId: 'inv-1',
      userId: 'user-1',
      finalValue: 2100,
      currentValue: 10800,
      redeemDate,
      partial: true,
    })

    expect(outcome.principalWithdrawn).toBe(1944.44)
    expect(outcome.yieldWithdrawn).toBe(155.56)
    expect(outcome.remainingNetValue).toBe(8700)
    expect(incomes[0]).toMatchObject({ amount: 2100 })
  })

  it('o valor informado atualiza a posição, e o bruto acompanha o salto', async () => {
    const sut = makeService(makeInvestment())

    await sut.execute({
      investmentId: 'inv-1',
      userId: 'user-1',
      finalValue: 2100,
      currentValue: 10800,
      redeemDate,
      partial: true,
    })

    // Bruto guardado (10.600) sobe na mesma proporção do líquido
    // (10.800/10.500) e depois perde a fatia sacada.
    expect(updates[0]).toMatchObject({ amount: 8055.56, netValue: 8700 })
    expect(updates[0].grossYield).toBe(8782.86)
  })

  it('recusa resgate parcial de ETF/FII, que é venda por cota', async () => {
    const sut = makeService(
      makeInvestment({
        investment_type: 'FII',
        amount: new Prisma.Decimal(72.11),
        quantity: new Prisma.Decimal(3),
        is_reserve: false,
        gross_yield: null,
        net_value: null,
      }),
    )

    await expect(
      sut.execute({
        investmentId: 'inv-1',
        userId: 'user-1',
        finalValue: 75,
        redeemDate,
        partial: true,
      }),
    ).rejects.toThrow(PARTIAL_NOT_SUPPORTED_MESSAGE)
  })

  it('no resgate total de FII o aplicado é preço da cota × quantidade', async () => {
    const sut = makeService(
      makeInvestment({
        investment_type: 'FII',
        amount: new Prisma.Decimal(72.11),
        quantity: new Prisma.Decimal(3),
        is_reserve: false,
        gross_yield: null,
        net_value: null,
      }),
    )

    const { outcome } = await sut.execute({
      investmentId: 'inv-1',
      userId: 'user-1',
      finalValue: 230,
      redeemDate,
    })

    expect(outcome.principalWithdrawn).toBe(216.33)
    expect(outcome.yieldWithdrawn).toBe(13.67)
  })

  it('lança a entrada no mês da data do resgate, não no do vencimento', async () => {
    const sut = makeService(
      makeInvestment({
        is_reserve: false,
        maturity_date: new Date('2028-02-24T12:00:00Z'),
      }),
    )

    await sut.execute({
      investmentId: 'inv-1',
      userId: 'user-1',
      finalValue: 500,
      redeemDate,
      partial: true,
    })

    expect(incomes[0]).toMatchObject({ month: '08', year: 2026 })
  })
})
