import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { GetCdiComparisonService } from '@/services/get-cdi-comparison'
import { CdiUnavailableError } from '@/lib/bcb'

const querySchema = z.object({
  type: z
    .enum([
      'STOCKS',
      'FUNDS',
      'CRYPTO',
      'SAVINGS',
      'CDB',
      'LCI_LCA',
      'DEBENTURES',
      'TREASURY',
      'ETF',
      'FII',
      'OTHER',
    ])
    .optional(),
})

export async function getCdiComparison(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { type } = querySchema.parse(request.query)

    const service = new GetCdiComparisonService()
    const result = await service.execute({
      userId: request.user.sub,
      investmentType: type,
    })

    return reply.status(200).send(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ message: 'Tipo de investimento inválido' })
    }
    if (error instanceof CdiUnavailableError) {
      return reply.status(503).send({ message: error.message })
    }
    console.error('Erro ao comparar investimentos com CDI:', error)
    return reply.status(500).send({ message: 'Erro interno do servidor' })
  }
}
