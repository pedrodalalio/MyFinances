import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { makeConfirmMonthService } from '@/services/factories/make-confirm-month-service'
import { ResourceNotFoundError } from '@/services/errors/resource-not-found-error'

export async function confirmMonth(request: FastifyRequest, reply: FastifyReply) {
  const confirmMonthParamsSchema = z.object({
    month: z.string(),
    year: z.coerce.number()
  })

  const { month, year } = confirmMonthParamsSchema.parse(request.params)

  try {
    const confirmMonthService = makeConfirmMonthService()

    await confirmMonthService.execute({
      userId: request.user.sub,
      month,
      year
    })

    return reply.status(200).send({
      message: 'Mês confirmado com sucesso'
    })
  } catch (err) {
    if (err instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: err.message })
    }

    throw err
  }
}