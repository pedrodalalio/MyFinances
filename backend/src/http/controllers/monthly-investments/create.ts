import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { makeCreateInvestmentService } from '@/services/factories/make-create-investment-service'

export async function create(request: FastifyRequest, reply: FastifyReply) {
  const createMonthlyInvestmentBodySchema = z.object({
    name: z.string(),
    description: z.string().optional(),
    amount: z.number().positive(),
    gross_yield: z.number().optional(),
    investment_type: z.enum(['STOCKS', 'FUNDS', 'CRYPTO', 'SAVINGS', 'CDB', 'LCI_LCA', 'DEBENTURES', 'TREASURY', 'OTHER']),
    category: z.string().optional(),
    month: z.string(),
    year: z.number(),
    date: z.string().optional().transform((str) => str ? new Date(str) : undefined),
    purchase_date: z.string().optional().transform((str) => str ? new Date(str) : undefined),
    maturity_date: z.string().optional().transform((str) => str ? new Date(str) : undefined),
    interest_rate: z.number().optional(),
    quantity: z.number().optional(),
    broker: z.string().optional(),
    notes: z.string().optional()
  })

  const body = createMonthlyInvestmentBodySchema.parse(request.body)

  try {
    const createInvestmentService = makeCreateInvestmentService()

    const { investment } = await createInvestmentService.execute({
      name: body.name,
      description: body.description,
      amount: body.amount,
      grossYield: body.gross_yield,
      investmentType: body.investment_type,
      category: body.category,
      month: body.month,
      year: body.year,
      date: body.date,
      purchaseDate: body.purchase_date,
      maturityDate: body.maturity_date,
      interestRate: body.interest_rate,
      quantity: body.quantity,
      broker: body.broker,
      notes: body.notes,
      userId: request.user.sub
    })

    return reply.status(201).send({
      investment
    })
  } catch (err) {
    throw err
  }
}