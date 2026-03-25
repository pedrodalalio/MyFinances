import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { prisma } from "@/lib/prisma"

export async function deleteImport(request: FastifyRequest, reply: FastifyReply) {
  const paramsSchema = z.object({
    importId: z.string(),
  })

  const { importId } = paramsSchema.parse(request.params)

  const importRecord = await prisma.import.findFirst({
    where: {
      id: importId,
      user_id: request.user.sub,
    },
  })

  if (!importRecord) {
    return reply.status(404).send({ message: "Importação não encontrada." })
  }

  await prisma.import.delete({
    where: { id: importId },
  })

  return reply.status(204).send()
}
