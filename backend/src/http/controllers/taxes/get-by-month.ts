import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { GetTaxesByMonthService } from "@/services/get-taxes-by-month"
import { PrismaTaxRepository } from "@/repositories/prisma/prisma-tax-repository"

export async function getByMonth(request: FastifyRequest, reply: FastifyReply) {
  const getTaxesByMonthParamsSchema = z.object({
    month: z.string(),
    year: z.coerce.number()
  })

  const { month, year } = getTaxesByMonthParamsSchema.parse(request.params)

  const taxRepository = new PrismaTaxRepository()
  const getTaxesByMonthService = new GetTaxesByMonthService(taxRepository)

  const { taxes } = await getTaxesByMonthService.execute({
    userId: request.user.sub,
    month,
    year
  })

  return reply.status(200).send({
    taxes
  })
}