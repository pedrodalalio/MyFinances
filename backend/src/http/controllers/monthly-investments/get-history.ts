import { FastifyRequest, FastifyReply } from 'fastify'
import { GetInvestmentHistoryService } from '@/services/get-investment-history'

export async function getInvestmentHistory(request: FastifyRequest, reply: FastifyReply) {
  try {
    const service = new GetInvestmentHistoryService()

    const { investments } = await service.execute({
      userId: request.user.sub,
    })

    return reply.status(200).send({ investments })
  } catch (error) {
    console.error('Erro ao buscar histórico de investimentos:', error)
    return reply.status(500).send({ message: 'Erro interno do servidor' })
  }
}
