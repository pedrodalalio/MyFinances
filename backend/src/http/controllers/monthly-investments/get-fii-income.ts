import { FastifyRequest, FastifyReply } from 'fastify'
import { makeGetFiiIncomeForecastService } from '@/services/factories/make-get-fii-income-forecast-service'

export async function getFiiIncome(request: FastifyRequest, reply: FastifyReply) {
  try {
    const service = makeGetFiiIncomeForecastService()
    const result = await service.execute({ userId: request.user.sub })

    return reply.status(200).send(result)
  } catch (error) {
    console.error('Erro ao buscar previsão de proventos FII:', error)
    return reply.status(500).send({ message: 'Internal server error' })
  }
}
