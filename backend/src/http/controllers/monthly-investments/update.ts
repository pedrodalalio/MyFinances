import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { makeUpdateInvestmentService } from '@/services/factories/make-update-investment-service'
import { ResourceNotFoundError } from '@/services/errors/resource-not-found-error'

export async function update(request: FastifyRequest, reply: FastifyReply) {
  const updateMonthlyInvestmentParamsSchema = z.object({
    id: z.string().uuid()
  })

  const updateMonthlyInvestmentBodySchema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    amount: z.number().positive().optional(),
    net_value: z.number().optional(),
    gross_yield: z.number().optional(),
    investment_type: z.enum(['STOCKS', 'FUNDS', 'CRYPTO', 'SAVINGS', 'CDB', 'LCI_LCA', 'DEBENTURES', 'TREASURY', 'ETF', 'FII', 'OTHER']).optional(),
    category: z.string().optional(),
    date: z.string().optional().transform((str) => str && str.length > 0 ? new Date(str + "T12:00:00Z") : undefined),
    purchase_date: z.string().optional().transform((str) => str && str.length > 0 ? new Date(str + "T12:00:00Z") : undefined),
    maturity_date: z.string().optional().transform((str) => str && str.length > 0 ? new Date(str + "T12:00:00Z") : undefined),
    interest_rate: z.number().optional(),
    quantity: z.number().optional(),
    broker: z.string().optional(),
    ticker: z.string().optional(),
    dividend_yield: z.number().optional(),
    notes: z.string().optional()
  })

  const { id } = updateMonthlyInvestmentParamsSchema.parse(request.params)
  const body = updateMonthlyInvestmentBodySchema.parse(request.body)

  try {
    const updateInvestmentService = makeUpdateInvestmentService()

    const { investment } = await updateInvestmentService.execute({
      investmentId: id,
      name: body.name,
      description: body.description,
      amount: body.amount,
      netValue: body.net_value,
      grossYield: body.gross_yield,
      investmentType: body.investment_type,
      category: body.category,
      date: body.date,
      purchaseDate: body.purchase_date,
      maturityDate: body.maturity_date,
      interestRate: body.interest_rate,
      quantity: body.quantity,
      broker: body.broker,
      ticker: body.ticker,
      dividendYield: body.dividend_yield,
      notes: body.notes,
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