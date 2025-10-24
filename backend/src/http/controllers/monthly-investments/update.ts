import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { makeUpdateMonthlyInvestmentService } from '@/services/factories/make-update-monthly-investment-service'
import { ResourceNotFoundError } from '@/services/errors/resource-not-found-error'

export async function update(request: FastifyRequest, reply: FastifyReply) {
  const updateMonthlyInvestmentParamsSchema = z.object({
    id: z.string().uuid()
  })

  const updateMonthlyInvestmentBodySchema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    amount: z.number().positive().optional(),
    investment_type: z.enum(['STOCKS', 'FUNDS', 'CRYPTO', 'SAVINGS', 'CDB', 'LCI_LCA', 'DEBENTURES', 'TREASURY', 'OTHER']).optional(),
    category: z.string().optional(),
    month: z.string().optional(),
    year: z.number().optional(),
    date: z.string().optional().transform((str) => str ? new Date(str) : undefined)
  })

  const { id } = updateMonthlyInvestmentParamsSchema.parse(request.params)
  const body = updateMonthlyInvestmentBodySchema.parse(request.body)

  try {
    const updateMonthlyInvestmentService = makeUpdateMonthlyInvestmentService()

    const { investment } = await updateMonthlyInvestmentService.execute({
      investmentId: id,
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

    return reply.status(200).send({
      investment
    })
  } catch (err) {
    if (err instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: err.message })
    }

    throw err
  }
}