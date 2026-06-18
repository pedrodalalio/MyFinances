import { FastifyRequest, FastifyReply } from 'fastify'
import { makeGetInvestmentQuotesService } from '@/services/factories/make-get-investment-quotes-service'
import { BrapiTokenMissingError } from '@/lib/brapi'

export async function getQuotes(request: FastifyRequest, reply: FastifyReply) {
  try {
    const service = makeGetInvestmentQuotesService()
    const result = await service.execute({ userId: request.user.sub })

    return reply.status(200).send(result)
  } catch (error) {
    if (error instanceof BrapiTokenMissingError) {
      return reply.status(503).send({ message: error.message })
    }
    console.error('Erro ao buscar cotações:', error)
    return reply.status(500).send({ message: 'Internal server error' })
  }
}
