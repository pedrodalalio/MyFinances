import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { parseDateOnly } from '@/utils/date'
import { makeRedeemInvestmentService } from '@/services/factories/make-redeem-investment-service'
import { PARTIAL_NOT_SUPPORTED_MESSAGE } from '@/services/redeem-investment'

const paramsSchema = z.object({
  id: z.string().uuid()
})

const bodySchema = z.object({
  final_value: z.number().nonnegative(),
  // Aceita "2026-08-13" (do formulário) ou ISO completo
  redeem_date: z
    .string()
    .optional()
    .transform((str) =>
      str && str.length > 0 ? (str.includes('T') ? new Date(str) : parseDateOnly(str)) : undefined
    ),
  partial: z.boolean().optional(),
  // Quanto a aplicação vale hoje, conferido na hora do resgate
  current_value: z.number().nonnegative().optional()
})

export async function redeem(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = paramsSchema.parse(request.params)
    const { final_value, redeem_date, partial, current_value } = bodySchema.parse(request.body)

    const service = makeRedeemInvestmentService()
    const result = await service.execute({
      investmentId: id,
      userId: request.user.sub,
      finalValue: final_value,
      redeemDate: redeem_date,
      partial,
      currentValue: current_value
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
      if (
        error.message === 'Investimento não está ativo' ||
        error.message === PARTIAL_NOT_SUPPORTED_MESSAGE ||
        error.message === 'Valor do resgate parcial deve ser maior que zero'
      ) {
        return reply.status(400).send({ message: error.message })
      }
    }
    console.error('Erro ao resgatar investimento:', error)
    return reply.status(500).send({ message: 'Internal server error' })
  }
}
