import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { prisma } from "@/lib/prisma"

/**
 * Cadastra UMA única transação da importação (sem agrupamento), criando o
 * registro correspondente (gasto/entrada/investimento/imposto) e marcando-a
 * como confirmada para que o "Confirmar tudo" não a recrie.
 *
 * Com `skipCreate: true` apenas marca a transação como confirmada sem criar
 * nenhum registro — usado quando o investimento já foi cadastrado pelo
 * formulário de investimentos (fluxo de importação → tela de investimento),
 * evitando a criação duplicada do investimento "Outros".
 */
export async function confirmTransaction(request: FastifyRequest, reply: FastifyReply) {
  const paramsSchema = z.object({
    transactionId: z.string(),
  })

  const bodySchema = z.object({
    skipCreate: z.boolean().optional(),
  })

  const { transactionId } = paramsSchema.parse(request.params)
  const { skipCreate } = bodySchema.parse(request.body ?? {})
  const userId = request.user.sub

  const transaction = await prisma.importTransaction.findFirst({
    where: { id: transactionId },
    include: { import: { select: { user_id: true } } },
  })

  if (!transaction || transaction.import.user_id !== userId) {
    return reply.status(404).send({ message: "Transação não encontrada." })
  }

  if (transaction.is_confirmed) {
    return reply.status(400).send({ message: "Transação já foi cadastrada." })
  }

  if (transaction.type === "IGNORE" || transaction.type === "TRANSFER") {
    return reply.status(400).send({
      message: "Escolha um tipo (Gasto, Entrada, Investimento ou Imposto) antes de cadastrar.",
    })
  }

  const date = transaction.date
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const year = date.getFullYear()
  const name = transaction.description
  const amount = transaction.amount
  const category = transaction.category

  if (skipCreate) {
    // O registro já foi criado por outro fluxo (ex.: formulário de investimento);
    // apenas marca como confirmada.
  } else if (transaction.type === "EXPENSE") {
    await prisma.expense.create({
      data: { name, amount, payment_method: "PIX", category, month, year, date, user_id: userId },
    })
  } else if (transaction.type === "INCOME") {
    await prisma.income.create({
      data: { name, amount, source: category, category, month, year, date, user_id: userId },
    })
  } else if (transaction.type === "INVESTMENT") {
    await prisma.investment.create({
      data: {
        name,
        amount,
        investment_type: "OTHER",
        category,
        date,
        purchase_date: date,
        user_id: userId,
      },
    })
  } else if (transaction.type === "TAX") {
    await prisma.tax.create({
      data: {
        tax_type: "OTHER",
        amount,
        payment_method: "PIX",
        frequency: "MONTHLY",
        day_of_month: date.getDate(),
        month,
        year,
        due_date: date,
        user_id: userId,
      },
    })
  }

  const updated = await prisma.importTransaction.update({
    where: { id: transactionId },
    data: { is_confirmed: true },
  })

  return reply.status(201).send({ transaction: updated })
}
