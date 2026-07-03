import { FastifyRequest, FastifyReply } from 'fastify'
import { makeGetFiiRankingService } from '@/services/factories/make-get-fii-ranking-service'
import { FiiMarketUnavailableError } from '@/services/get-fii-ranking'

export async function getFiiRanking(request: FastifyRequest, reply: FastifyReply) {
  try {
    const service = makeGetFiiRankingService()
    const result = await service.execute({ userId: request.user.sub })

    return reply.status(200).send(result)
  } catch (error) {
    if (error instanceof FiiMarketUnavailableError) {
      return reply.status(503).send({ message: error.message })
    }
    console.error('Erro ao montar ranking de FIIs:', error)
    return reply.status(500).send({ message: 'Internal server error' })
  }
}
