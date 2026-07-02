import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { PrismaPaymentCheckRepository } from "@/repositories/prisma/prisma-payment-check-repository"

export async function getByMonth(request: FastifyRequest, reply: FastifyReply) {
  const getPaymentChecksParamsSchema = z.object({
    month: z.string().regex(/^(0[1-9]|1[0-2])$/, "Mês deve estar entre 01 e 12"),
    year: z.coerce.number()
  })

  const { month, year } = getPaymentChecksParamsSchema.parse(request.params)

  const paymentCheckRepository = new PrismaPaymentCheckRepository()

  const checks = await paymentCheckRepository.findByMonthAndUser(
    request.user.sub,
    month,
    year
  )

  return reply.status(200).send({
    checks: checks.map((check) => check.item_key)
  })
}
