import { z } from 'zod'
import { FastifyRequest, FastifyReply } from 'fastify'
import { LookupFiiService, FiiNotFoundError } from '@/services/lookup-fii'

export async function getFiiLookup(request: FastifyRequest, reply: FastifyReply) {
  const paramsSchema = z.object({
    ticker: z.string().regex(/^[A-Za-z0-9]{4,10}$/, 'Ticker inválido'),
  })

  const { ticker } = paramsSchema.parse(request.params)

  try {
    const service = new LookupFiiService()
    const result = await service.execute({ ticker })

    return reply.status(200).send(result)
  } catch (error) {
    if (error instanceof FiiNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    console.error('Erro no lookup de FII:', error)
    return reply.status(500).send({ message: 'Internal server error' })
  }
}
