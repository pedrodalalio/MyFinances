import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { makeUpdatePortfolioAssetService } from '@/services/factories/make-update-portfolio-asset-service'

export async function updateAsset(request: FastifyRequest, reply: FastifyReply) {
  const updateAssetParamsSchema = z.object({
    assetId: z.string().uuid()
  })

  const updateAssetBodySchema = z.object({
    name: z.string().optional(),
    asset_type: z.enum(['CDB', 'TREASURY_DIRECT', 'LCI_LCA', 'SAVINGS', 'STOCKS', 'FUNDS', 'CRYPTO', 'DEBENTURES', 'OTHER']).optional(),
    initial_investment: z.number().positive().optional(),
    current_value: z.number().positive().optional(),
    quantity: z.number().optional(),
    purchase_date: z.string().optional().transform((str) => str ? new Date(str) : undefined),
    maturity_date: z.string().optional().transform((str) => str ? new Date(str) : undefined),
    interest_rate: z.number().optional(),
    status: z.enum(['ACTIVE', 'MATURED', 'SOLD', 'CANCELLED']).optional(),
    notes: z.string().optional(),
    broker: z.string().optional()
  })

  const { assetId } = updateAssetParamsSchema.parse(request.params)
  const body = updateAssetBodySchema.parse(request.body)

  try {
    const updatePortfolioAssetService = makeUpdatePortfolioAssetService()

    const { asset } = await updatePortfolioAssetService.execute({
      assetId,
      name: body.name,
      assetType: body.asset_type,
      initialInvestment: body.initial_investment,
      currentValue: body.current_value,
      quantity: body.quantity,
      purchaseDate: body.purchase_date,
      maturityDate: body.maturity_date,
      interestRate: body.interest_rate,
      status: body.status,
      notes: body.notes,
      broker: body.broker,
      userId: request.user.sub
    })

    return reply.status(200).send({
      asset
    })
  } catch (err) {
    throw err
  }
}