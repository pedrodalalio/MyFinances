import { FastifyRequest, FastifyReply } from 'fastify'
import { makeGetInvestmentPortfolioService } from '@/services/factories/make-get-investment-portfolio-service'

export async function getPortfolio(request: FastifyRequest, reply: FastifyReply) {
  try {
    const getInvestmentPortfolioService = makeGetInvestmentPortfolioService()

    const portfolio = await getInvestmentPortfolioService.execute({
      userId: request.user.sub
    })

    return reply.status(200).send(portfolio)
  } catch (err) {
    throw err
  }
}