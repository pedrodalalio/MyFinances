import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { makeCreatePortfolioAssetService } from '@/services/factories/make-create-portfolio-asset-service'

export async function createAsset(request: FastifyRequest, reply: FastifyReply) {
  const createAssetBodySchema = z.object({
    name: z.string(),
    asset_type: z.enum(['CDB', 'TREASURY_DIRECT', 'LCI_LCA', 'SAVINGS', 'STOCKS', 'FUNDS', 'CRYPTO', 'DEBENTURES', 'OTHER']),
    initial_investment: z.number().positive(),
    current_value: z.number().positive(),
    quantity: z.number().optional(),
    purchase_date: z.string().transform((str) => new Date(str)),
    maturity_date: z.string().optional().transform((str) => str ? new Date(str) : undefined),
    interest_rate: z.number().optional(),
    notes: z.string().optional(),
    broker: z.string().optional()
  })

  const body = createAssetBodySchema.parse(request.body)

  try {
    const createPortfolioAssetService = makeCreatePortfolioAssetService()

    const { asset } = await createPortfolioAssetService.execute({
      name: body.name,
      assetType: body.asset_type,
      initialInvestment: body.initial_investment,
      currentValue: body.current_value,
      quantity: body.quantity,
      purchaseDate: body.purchase_date,
      maturityDate: body.maturity_date,
      interestRate: body.interest_rate,
      notes: body.notes,
      broker: body.broker,
      userId: request.user.sub
    })

    return reply.status(201).send({
      asset
    })
  } catch (err) {
    throw err
  }
}