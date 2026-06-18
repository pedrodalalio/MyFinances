import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { prisma } from "@/lib/prisma"
import { fetchExistingRecords, matchTransactions } from "@/services/import/match"

export async function getTransactions(request: FastifyRequest, reply: FastifyReply) {
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
      transactions: {
        orderBy: { date: "desc" },
      },
    },
  })

  if (!importRecord) {
    return reply.status(404).send({ message: "Importação não encontrada." })
  }

  // Recalcular órfãos (cadastrado no banco mas ausente no extrato) para a
  // seção ficar sempre atualizada ao reabrir a importação.
  const existingRecords = await fetchExistingRecords(
    request.user.sub,
    importRecord.month,
    importRecord.year,
  )
  const { orphans } = matchTransactions(
    existingRecords,
    importRecord.transactions.map((t) => ({
      id: t.id,
      amount: Number(t.amount),
      isCredit: t.is_credit,
      groupKey: t.group_key,
    })),
  )

  return reply.status(200).send({ import: importRecord, orphans })
}
