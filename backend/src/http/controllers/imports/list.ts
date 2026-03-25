import { FastifyRequest, FastifyReply } from "fastify"
import { prisma } from "@/lib/prisma"

export async function list(request: FastifyRequest, reply: FastifyReply) {
  const imports = await prisma.import.findMany({
    where: { user_id: request.user.sub },
    orderBy: { created_at: "desc" },
    include: {
      _count: { select: { transactions: true } },
    },
  })

  return reply.status(200).send({ imports })
}
