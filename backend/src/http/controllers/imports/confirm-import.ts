import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { prisma } from "@/lib/prisma"
import { ImportTransaction } from "@prisma/client"

export async function confirmImport(request: FastifyRequest, reply: FastifyReply) {
  const paramsSchema = z.object({
    importId: z.string(),
  })

  const { importId } = paramsSchema.parse(request.params)

  const importRecord = await prisma.import.findFirst({
    where: {
      id: importId,
      user_id: request.user.sub,
    },
    include: {
      transactions: true,
    },
  })

  if (!importRecord) {
    return reply.status(404).send({ message: "Importação não encontrada." })
  }

  if (importRecord.status === "confirmed") {
    return reply.status(400).send({ message: "Importação já foi confirmada." })
  }

  const userId = request.user.sub

  // Filtrar transações não-ignoradas e que ainda não foram cadastradas
  // individualmente (via botão "Cadastrar" de cada linha).
  const activeTransactions = importRecord.transactions.filter(
    t => t.type !== "IGNORE" && !t.is_confirmed,
  )

  // Agrupar transações pelo group_key + type
  const groups = new Map<string, ImportTransaction[]>()
  for (const t of activeTransactions) {
    const key = t.group_key ? `${t.group_key}_${t.type}` : t.id // sem group_key = individual
    const group = groups.get(key) || []
    group.push(t)
    groups.set(key, group)
  }

  let createdCount = { expenses: 0, incomes: 0, investments: 0, taxes: 0 }

  for (const [, transactions] of groups) {
    const first = transactions[0]
    const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0)
    const count = transactions.length
    const name = count > 1
      ? `${first.description} (${count}x)`
      : first.description
    const category = first.category

    // Usar a data mais recente do grupo
    const latestDate = transactions.reduce((latest, t) =>
      t.date > latest ? t.date : latest, transactions[0].date)
    const monthNum = latestDate.getMonth() + 1
    const month = monthNum.toString().padStart(2, "0")
    const year = latestDate.getFullYear()

    if (first.type === "EXPENSE") {
      await prisma.expense.create({
        data: {
          name,
          amount: totalAmount,
          payment_method: "PIX",
          category,
          month,
          year,
          date: latestDate,
          user_id: userId,
        },
      })
      createdCount.expenses++
    } else if (first.type === "INCOME") {
      await prisma.income.create({
        data: {
          name,
          amount: totalAmount,
          source: category,
          category,
          month,
          year,
          date: latestDate,
          user_id: userId,
        },
      })
      createdCount.incomes++
    } else if (first.type === "INVESTMENT") {
      await prisma.investment.create({
        data: {
          name,
          amount: totalAmount,
          investment_type: "OTHER",
          category,
          date: latestDate,
          purchase_date: latestDate,
          user_id: userId,
        },
      })
      createdCount.investments++
    } else if (first.type === "TAX") {
      await prisma.tax.create({
        data: {
          tax_type: "OTHER",
          amount: totalAmount,
          payment_method: "PIX",
          frequency: "MONTHLY",
          day_of_month: latestDate.getDate(),
          month,
          year,
          due_date: latestDate,
          user_id: userId,
        },
      })
      createdCount.taxes++
    }
  }

  // Marcar importação como confirmada
  await prisma.import.update({
    where: { id: importId },
    data: { status: "confirmed" },
  })

  const ignored = importRecord.transactions.filter(t => t.type === "IGNORE").length
  const grouped = activeTransactions.length - groups.size

  return reply.status(200).send({
    message: "Importação confirmada com sucesso!",
    counts: {
      ...createdCount,
      ignored,
      grouped_transactions: grouped,
    },
  })
}
