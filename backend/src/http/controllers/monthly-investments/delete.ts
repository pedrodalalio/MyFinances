import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { makeDeleteInvestmentService } from '@/services/factories/make-delete-investment-service'
import { ResourceNotFoundError } from '@/services/errors/resource-not-found-error'

export async function deleteInvestment(request: FastifyRequest, reply: FastifyReply) {
  const deleteMonthlyInvestmentParamsSchema = z.object({
    id: z.string().uuid()
  })

  const { id } = deleteMonthlyInvestmentParamsSchema.parse(request.params)

  try {
    const deleteInvestmentService = makeDeleteInvestmentService()

    await deleteInvestmentService.execute({
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