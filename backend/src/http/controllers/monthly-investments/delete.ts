import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { makeDeleteMonthlyInvestmentService } from '@/services/factories/make-delete-monthly-investment-service'
import { ResourceNotFoundError } from '@/services/errors/resource-not-found-error'

export async function deleteMonthlyInvestment(request: FastifyRequest, reply: FastifyReply) {
  const deleteMonthlyInvestmentParamsSchema = z.object({
    id: z.string().uuid()
  })

  const { id } = deleteMonthlyInvestmentParamsSchema.parse(request.params)

  try {
    const deleteMonthlyInvestmentService = makeDeleteMonthlyInvestmentService()

    await deleteMonthlyInvestmentService.execute({
      investmentId: id,
      userId: request.user.sub
    })

    return reply.status(204).send()
  } catch (err) {
    if (err instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: err.message })
    }

    throw err
  }
}