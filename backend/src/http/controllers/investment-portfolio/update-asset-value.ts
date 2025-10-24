import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { makeUpdateAssetValueService } from '@/services/factories/make-update-asset-value-service'

export async function updateAssetValue(request: FastifyRequest, reply: FastifyReply) {
  const updateAssetValueParamsSchema = z.object({
    assetId: z.string().uuid()
  })

  const updateAssetValueBodySchema = z.object({
    current_value: z.number().positive(),
    notes: z.string().optional()
  })

  const { assetId } = updateAssetValueParamsSchema.parse(request.params)
  const body = updateAssetValueBodySchema.parse(request.body)

  try {
    const updateAssetValueService = makeUpdateAssetValueService()

    const { asset, history } = await updateAssetValueService.execute({
      assetId,
      currentValue: body.current_value,
      notes: body.notes,
      userId: request.user.sub
    })

    return reply.status(200).send({
      asset,
      history
    })
  } catch (err) {
    throw err
  }
}