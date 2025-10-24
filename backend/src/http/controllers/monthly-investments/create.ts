import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { makeCreateMonthlyInvestmentService } from '@/services/factories/make-create-monthly-investment-service'

export async function create(request: FastifyRequest, reply: FastifyReply) {
  const createMonthlyInvestmentBodySchema = z.object({
    name: z.string(),
    description: z.string().optional(),
    amount: z.number().positive(),
    investment_type: z.enum(['STOCKS', 'FUNDS', 'CRYPTO', 'SAVINGS', 'CDB', 'LCI_LCA', 'DEBENTURES', 'TREASURY', 'OTHER']),
    category: z.string().optional(),
    month: z.string(),
    year: z.number(),
    date: z.string().optional().transform((str) => str ? new Date(str) : undefined)
  })

  const body = createMonthlyInvestmentBodySchema.parse(request.body)

  try {
    const createMonthlyInvestmentService = makeCreateMonthlyInvestmentService()

    const { investment } = await createMonthlyInvestmentService.execute({
      name: body.name,
      description: body.description,
      amount: body.amount,
      investmentType: body.investment_type,
      category: body.category,
      month: body.month,
      year: body.year,
      date: body.date,
      userId: request.user.sub
    })

    return reply.status(201).send({
      investment
    })
  } catch (err) {
    throw err
  }
}