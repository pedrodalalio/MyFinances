import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { prisma } from "@/lib/prisma"

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

  return reply.status(200).send({ import: importRecord })
}
