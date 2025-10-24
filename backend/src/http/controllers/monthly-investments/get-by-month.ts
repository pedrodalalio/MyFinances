import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { makeGetMonthlyInvestmentsByMonthService } from '@/services/factories/make-get-monthly-investments-by-month-service'

export async function getByMonth(request: FastifyRequest, reply: FastifyReply) {
  const getMonthlyInvestmentsByMonthParamsSchema = z.object({
    month: z.string(),
    year: z.coerce.number()
  })

  const { month, year } = getMonthlyInvestmentsByMonthParamsSchema.parse(request.params)

  try {
    const getMonthlyInvestmentsByMonthService = makeGetMonthlyInvestmentsByMonthService()

    const { investments } = await getMonthlyInvestmentsByMonthService.execute({
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