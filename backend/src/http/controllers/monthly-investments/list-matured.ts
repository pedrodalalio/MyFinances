import { FastifyRequest, FastifyReply } from 'fastify'
import { makeListMaturedInvestmentsService } from '@/services/factories/make-list-matured-investments-service'

export async function listMatured(request: FastifyRequest, reply: FastifyReply) {
  try {
    const service = makeListMaturedInvestmentsService()
    const result = await service.execute(request.user.sub)
    return reply.status(200).send(result)
  } catch (error) {
    console.error('Erro ao listar investimentos vencidos:', error)
    return reply.status(500).send({ message: 'Internal server error' })
  }
}
