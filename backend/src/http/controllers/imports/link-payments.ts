import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { prisma } from "@/lib/prisma"

/**
 * Vincula UMA linha do extrato (ex.: um PIX para outra conta) ao pagamento de
 * um ou mais gastos fixos daquele mês. Em vez de criar um gasto (o que
 * duplicaria — os gastos fixos já entram no total do mês como linhas virtuais),
 * apenas marca cada gasto fixo como pago via `payment_checks` e classifica a
 * linha como TRANSFERÊNCIA, resolvendo-a (is_confirmed) para não virar
 * lançamento no "Confirmar tudo".
 *
 * `itemKeys` são as chaves do checklist de pagamentos (`rec_<recurringId>`).
 */
export async function linkPayments(request: FastifyRequest, reply: FastifyReply) {
  const paramsSchema = z.object({
    transactionId: z.string(),
  })

  const bodySchema = z.object({
    itemKeys: z.array(z.string()).min(1),
  })

  const { transactionId } = paramsSchema.parse(request.params)
  const { itemKeys } = bodySchema.parse(request.body)
  const userId = request.user.sub

  const transaction = await prisma.importTransaction.findFirst({
    where: { id: transactionId },
    include: { import: { select: { user_id: true, month: true, year: true } } },
  })

  if (!transaction || transaction.import.user_id !== userId) {
    return reply.status(404).send({ message: "Transação não encontrada." })
  }

  if (transaction.is_confirmed) {
    return reply.status(400).send({ message: "Transação já foi cadastrada." })
  }

  const { month, year } = transaction.import

  await prisma.$transaction([
    ...itemKeys.map((item_key) =>
      prisma.paymentCheck.upsert({
        where: {
          user_id_item_key_month_year: { user_id: userId, item_key, month, year },
        },
        create: { user_id: userId, item_key, month, year },
        update: {},
      }),
    ),
    prisma.importTransaction.update({
      where: { id: transactionId },
      data: { type: "TRANSFER", is_confirmed: true },
    }),
  ])

  return reply.status(200).send({ month, year, linked: itemKeys.length })
}
