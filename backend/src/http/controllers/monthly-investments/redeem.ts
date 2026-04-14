import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { makeRedeemInvestmentService } from '@/services/factories/make-redeem-investment-service'

const paramsSchema = z.object({
  id: z.string().uuid()
})

const bodySchema = z.object({
  final_value: z.number().nonnegative(),
  redeem_date: z.string().datetime().optional()
})

export async function redeem(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = paramsSchema.parse(request.params)
    const { final_value, redeem_date } = bodySchema.parse(request.body)

    const service = makeRedeemInvestmentService()
    const result = await service.execute({
      investmentId: id,
      userId: request.user.sub,
      finalValue: final_value,
      redeemDate: redeem_date ? new Date(redeem_date) : undefined
    })

    return reply.status(200).send(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ message: 'Dados inválidos', issues: error.issues })
    }
    if (error instanceof Error) {
      if (error.message === 'Investimento não encontrado' || error.message === 'Investimento não pertence ao usuário') {
        return reply.status(404).send({ message: error.message })
      }
      if (error.message === 'Investimento não está ativo') {
        return reply.status(400).send({ message: error.message })
      }
    }
    console.error('Erro ao resgatar investimento:', error)
    return reply.status(500).send({ message: 'Internal server error' })
  }
}
