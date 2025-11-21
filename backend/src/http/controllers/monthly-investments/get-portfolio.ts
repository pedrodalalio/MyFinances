import { FastifyRequest, FastifyReply } from 'fastify'
import { makeGetInvestmentPortfolioUnifiedService } from '@/services/factories/make-get-investment-portfolio-unified-service'

export async function getPortfolio(request: FastifyRequest, reply: FastifyReply) {
  try {
    const getPortfolioService = makeGetInvestmentPortfolioUnifiedService()

    const portfolio = await getPortfolioService.execute(request.user.sub)

    return reply.status(200).send({
      portfolio
    })
  } catch (error) {
    console.error('Erro ao buscar portfolio de investimentos:', error)
    return reply.status(500).send({ message: 'Internal server error' })
  }
}