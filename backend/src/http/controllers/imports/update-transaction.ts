import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { prisma } from "@/lib/prisma"

export async function updateTransaction(request: FastifyRequest, reply: FastifyReply) {
  const paramsSchema = z.object({
    transactionId: z.string(),
  })

  const bodySchema = z.object({
    description: z.string().optional(),
    type: z.enum(["EXPENSE", "INCOME", "INVESTMENT", "TAX", "TRANSFER", "IGNORE"]).optional(),
    category: z.string().nullable().optional(),
  })

  const { transactionId } = paramsSchema.parse(request.params)
  const updateData = bodySchema.parse(request.body)

  // Verificar se a transação pertence ao usuário
  const transaction = await prisma.importTransaction.findFirst({
    where: { id: transactionId },
    include: { import: { select: { user_id: true } } },
  })

  if (!transaction || transaction.import.user_id !== request.user.sub) {
    return reply.status(404).send({ message: "Transação não encontrada." })
  }

  const updated = await prisma.importTransaction.update({
    where: { id: transactionId },
    data: updateData,
  })

  return reply.status(200).send({ transaction: updated })
}
