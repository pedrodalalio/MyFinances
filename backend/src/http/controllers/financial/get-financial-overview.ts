import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { makeGetFinancialOverviewService } from '@/services/factories/make-get-financial-overview-service'
import { ResourceNotFoundError } from '@/services/errors/resource-not-found-error'

export async function getFinancialOverview(request: FastifyRequest, reply: FastifyReply) {
  const getFinancialOverviewParamsSchema = z.object({
    month: z.string(),
    year: z.coerce.number()
  })

  const { month, year } = getFinancialOverviewParamsSchema.parse(request.params)

  try {
    const getFinancialOverviewService = makeGetFinancialOverviewService()

    const { overview } = await getFinancialOverviewService.execute({
      userId: request.user.sub,
      month,
      year
    })

    return reply.status(200).send({
      overview
    })
  } catch (err) {
    if (err instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: err.message })
    }

    throw err
  }
}