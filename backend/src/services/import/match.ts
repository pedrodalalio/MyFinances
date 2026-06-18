import { prisma } from "@/lib/prisma"
import { isRecurringActive } from "@/services/utils/recurring-expense"

export type RecordKind =
  | "expense"
  | "income"
  | "investment"
  | "tax"
  | "recurring"
  | "salary"

// Direção do dinheiro: out = saída (débito), in = entrada (crédito),
// any = pode ser os dois (investimento pode ser aplicação ou resgate).
export type RecordDirection = "in" | "out" | "any"

export interface ExistingRecord {
  kind: RecordKind
  name: string
  amount: number
  direction: RecordDirection
}

/**
 * Lançamento do extrato a ser conciliado. `id` é usado só para mapear o
 * resultado de volta; `groupKey` permite casar grupos (ex.: 2x280 = 560).
 */
export interface MatchableTransaction {
  id: string
  amount: number
  isCredit: boolean
  groupKey: string | null
}

export interface MatchResult {
  // id da transação do extrato -> nome do registro já cadastrado que ela casa
  duplicates: Map<string, string>
  // registros cadastrados no banco que NÃO apareceram no extrato (órfãos)
  orphans: ExistingRecord[]
}

/**
 * Busca tudo que já está cadastrado no mês para conciliar com o extrato:
 * gastos, entradas, investimentos (compra no mês), impostos, gastos fixos
 * ativos e salário (perfil de salário ativo no mês).
 */
export async function fetchExistingRecords(
  userId: string,
  month: string,
  year: number,
): Promise<ExistingRecord[]> {
  const monthInt = parseInt(month)
  const monthStart = new Date(Date.UTC(year, monthInt - 1, 1))
  const monthEnd = new Date(Date.UTC(year, monthInt, 1))

  const [expenses, incomes, investments, taxes, recurring, salaries] =
    await Promise.all([
      prisma.expense.findMany({
        where: { user_id: userId, month, year },
        select: { name: true, amount: true },
      }),
      prisma.income.findMany({
        where: { user_id: userId, month, year },
        select: { name: true, amount: true },
      }),
      prisma.investment.findMany({
        where: {
          user_id: userId,
          purchase_date: { gte: monthStart, lt: monthEnd },
        },
        select: { name: true, amount: true },
      }),
      prisma.tax.findMany({
        where: { user_id: userId, month, year },
        select: { tax_type: true, amount: true },
      }),
      prisma.recurringExpense.findMany({
        where: { user_id: userId },
      }),
      prisma.salaryProfile.findMany({
        where: {
          user_id: userId,
          is_active: true,
          start_date: { lt: monthEnd },
          OR: [{ end_date: null }, { end_date: { gte: monthStart } }],
        },
        select: { description: true, amount: true },
      }),
    ])

  const records: ExistingRecord[] = []

  for (const e of expenses)
    records.push({ kind: "expense", name: e.name, amount: Number(e.amount), direction: "out" })
  for (const i of incomes)
    records.push({ kind: "income", name: i.name, amount: Number(i.amount), direction: "in" })
  for (const v of investments)
    records.push({ kind: "investment", name: v.name, amount: Number(v.amount), direction: "any" })
  for (const t of taxes)
    records.push({ kind: "tax", name: t.tax_type, amount: Number(t.amount), direction: "out" })
  for (const r of recurring) {
    if (!isRecurringActive(r, month, year)) continue
    records.push({ kind: "recurring", name: r.name, amount: Number(r.amount), direction: "out" })
  }
  for (const s of salaries)
    records.push({ kind: "salary", name: s.description || "Salário", amount: Number(s.amount), direction: "in" })

  return records
}

/**
 * Concilia os lançamentos do extrato com os registros já cadastrados.
 *
 * - Passe 1: casa cada lançamento individualmente por valor + direção.
 * - Passe 2: para grupos do mesmo destinatário que não casaram individualmente,
 *   tenta casar o TOTAL do grupo (ex.: dois Pix de 280 = um gasto de 560).
 *
 * Cada registro só pode ser consumido uma vez (matching 1-para-1). O que sobra
 * sem casar são os "órfãos" (cadastrado no app, ausente no extrato).
 */
export function matchTransactions(
  records: ExistingRecord[],
  transactions: MatchableTransaction[],
): MatchResult {
  const consumed = new Array(records.length).fill(false)
  const duplicates = new Map<string, string>()

  function consume(amount: number, isCredit: boolean): string | null {
    for (let i = 0; i < records.length; i++) {
      if (consumed[i]) continue
      const r = records[i]
      if (Math.abs(r.amount - amount) > 0.001) continue
      const dirOk = isCredit
        ? r.direction === "in" || r.direction === "any"
        : r.direction === "out" || r.direction === "any"
      if (!dirOk) continue
      consumed[i] = true
      return r.name
    }
    return null
  }

  // Passe 1: individual
  for (const t of transactions) {
    const match = consume(t.amount, t.isCredit)
    if (match) duplicates.set(t.id, match)
  }

  // Passe 2: por total de grupo (só grupos sem nenhum membro já casado)
  const groups = new Map<string, MatchableTransaction[]>()
  for (const t of transactions) {
    if (!t.groupKey) continue
    const key = `${t.groupKey}_${t.isCredit}`
    const arr = groups.get(key)
    if (arr) arr.push(t)
    else groups.set(key, [t])
  }

  for (const members of groups.values()) {
    if (members.length < 2) continue
    if (members.some((m) => duplicates.has(m.id))) continue
    const total = members.reduce((s, m) => s + m.amount, 0)
    const match = consume(total, members[0].isCredit)
    if (match) for (const m of members) duplicates.set(m.id, match)
  }

  const orphans = records.filter((_, i) => !consumed[i])

  return { duplicates, orphans }
}
