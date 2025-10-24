import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { GetFinancialDataService } from "@/services/get-financial-data"
import { PrismaFinancialDataRepository } from "@/repositories/prisma/prisma-financial-data-repository"
import { ResourceNotFoundError } from "@/services/errors/resource-not-found-error"

export async function get(request: FastifyRequest, reply: FastifyReply) {
  const getFinancialDataParamsSchema = z.object({
    month: z.string(),
    year: z.string().transform((val) => parseInt(val))
  })

  const { month, year } = getFinancialDataParamsSchema.parse(request.params)

  try {
    const financialDataRepository = new PrismaFinancialDataRepository()
    const getFinancialDataService = new GetFinancialDataService(financialDataRepository)

    const { financialData } = await getFinancialDataService.execute({
      userId: request.user.sub,
      month,
      year
    })

    return reply.status(200).send({
      financialData
    })
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }

    throw error
  }
}