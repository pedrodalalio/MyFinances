import { describe, expect, it } from 'vitest'
import { GetFinancialOverviewService } from './get-financial-overview'
import { MonthRecords } from './month-summary'

// Regra que este teste trava: "acima do orçamento" é sobre GASTOS (despesas +
// cartão + impostos) passarem da receita. Investir — inclusive reinvestir um
// CDB que venceu — é alocação de capital, não gasto, e não pode disparar o
// alarme. Bug real: aportar ~R$10k num mês marcava "gastos acima da receita".

function makeRecords(over: Partial<MonthRecords>): MonthRecords {
  return {
    // previous_balance não-zero evita a busca do mês anterior neste unit test.
    financialData: {
      previous_balance: 1,
      main_income: 0,
      checking_account: 0,
      is_confirmed: false,
    } as unknown as MonthRecords['financialData'],
    salary: { amount: 5000 } as unknown as MonthRecords['salary'],
    installments: [],
    recurringPurchases: [],
    expenses: [],
    incomes: [],
    investments: [],
    taxes: [],
    ...over,
  }
}

function makeService(records: MonthRecords) {
  const monthSummaryStub = {
    fetch: async () => records,
    execute: async () => ({ isConfirmed: false }),
  }
  return new GetFinancialOverviewService(monthSummaryStub as never)
}

const req = { userId: 'u1', month: '06', year: 2026 }

describe('GetFinancialOverviewService — is_over_budget', () => {
  it('NÃO fica acima do orçamento por causa de um aporte grande em investimento', async () => {
    // Salário 5000, gastos 1000, mas R$10k reinvestidos (ex.: CDB que venceu).
    const service = makeService(
      makeRecords({
        expenses: [{ amount: 1000 }] as unknown as MonthRecords['expenses'],
        investments: [
          { amount: 10000, investment_type: 'CDB', is_reserve: false },
        ] as unknown as MonthRecords['investments'],
      }),
    )

    const { overview } = await service.execute(req)

    expect(overview.analysis.is_over_budget).toBe(false)
    // O aporte continua visível como investimento (é fato), só não é "gasto".
    expect(overview.financial_data.investment_subtotal).toBe(10000)
  })

  it('reserva (liquidez diária) não conta como saída nem entra no saldo', async () => {
    // Um aporte comum (500) + uma reserva grande (7000): só o comum é saída.
    const service = makeService(
      makeRecords({
        investments: [
          { amount: 500, investment_type: 'CDB', is_reserve: false },
          { amount: 7000, investment_type: 'CDB', is_reserve: true },
        ] as unknown as MonthRecords['investments'],
      }),
    )

    const { overview } = await service.execute(req)

    // Reserva fora do subtotal de investimentos e, portanto, fora das saídas.
    expect(overview.financial_data.investment_subtotal).toBe(500)
    // Saldo = receita (salário 5000 + saldo ant. 1) − investimento comum (500).
    expect(overview.financial_data.final_balance).toBe(4501)
    expect(overview.analysis.is_over_budget).toBe(false)
  })

  it('mês fechado exibe o snapshot congelado, ignorando edições posteriores', async () => {
    // Snapshot gravado no fechamento (junho correto: saldo 198,32).
    const snapshot = {
      mainIncome: 0,
      checkingAccount: 0,
      previousBalance: 240.73,
      salaryAmount: 4600,
      incomeSubtotal: 2134.7,
      expenseSubtotal: 2626.76,
      creditCardSubtotal: 1335.1,
      investmentSubtotal: 2729.2,
      taxSubtotal: 86.05,
      totalIncome: 6975.43,
      totalExpenses: 4047.91,
      totalOutflows: 6777.11,
      finalBalance: 198.32,
    }

    const service = makeService(
      makeRecords({
        financialData: {
          is_confirmed: true,
          closing_snapshot: snapshot,
          previous_balance: 240.73,
        } as unknown as MonthRecords['financialData'],
        // Lançamento ao vivo que daria OUTRO valor (R$10k) se recalculado —
        // não pode mais mexer no mês já fechado.
        investments: [
          { amount: 10000, investment_type: 'CDB', is_reserve: false },
        ] as unknown as MonthRecords['investments'],
      }),
    )

    const { overview } = await service.execute(req)

    // Vem do snapshot, não do recálculo ao vivo.
    expect(overview.financial_data.final_balance).toBe(198.32)
    expect(overview.financial_data.investment_subtotal).toBe(2729.2)
    expect(overview.analysis.is_over_budget).toBe(false)
  })

  it('FICA acima do orçamento quando os gastos de fato passam da receita', async () => {
    const service = makeService(
      makeRecords({
        expenses: [{ amount: 6000 }] as unknown as MonthRecords['expenses'],
      }),
    )

    const { overview } = await service.execute(req)

    expect(overview.analysis.is_over_budget).toBe(true)
  })
})
