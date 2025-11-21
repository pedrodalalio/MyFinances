import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { makeGetInvestmentsByMonthService } from '@/services/factories/make-get-investments-by-month-service'

export async function getByMonth(request: FastifyRequest, reply: FastifyReply) {
  const getMonthlyInvestmentsByMonthParamsSchema = z.object({
    month: z.string(),
    year: z.coerce.number()
  })

  const { month, year } = getMonthlyInvestmentsByMonthParamsSchema.parse(request.params)

  try {
    const getInvestmentsByMonthService = makeGetInvestmentsByMonthService()

    const { investments } = await getInvestmentsByMonthService.execute({
      userId: request.user.sub,
      month,
      year
    })

    return reply.status(200).send({
      investments
    })
  } catch (err) {
    throw err
  }
}