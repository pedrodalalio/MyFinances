import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { PrismaPaymentCheckRepository } from "@/repositories/prisma/prisma-payment-check-repository"

export async function set(request: FastifyRequest, reply: FastifyReply) {
  const setPaymentCheckBodySchema = z.object({
    item_key: z.string().min(1),
    month: z.string().regex(/^(0[1-9]|1[0-2])$/, "Mês deve estar entre 01 e 12"),
    year: z.number(),
    paid: z.boolean()
  })

  const { item_key, month, year, paid } = setPaymentCheckBodySchema.parse(
    request.body
  )

  const paymentCheckRepository = new PrismaPaymentCheckRepository()

  await paymentCheckRepository.set({
    userId: request.user.sub,
    itemKey: item_key,
    month,
    year,
    paid
  })

  return reply.status(204).send()
}
