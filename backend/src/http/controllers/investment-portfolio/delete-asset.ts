import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { makeDeletePortfolioAssetService } from '@/services/factories/make-delete-portfolio-asset-service'

export async function deleteAsset(request: FastifyRequest, reply: FastifyReply) {
  const deleteAssetParamsSchema = z.object({
    assetId: z.string().uuid()
  })

  const { assetId } = deleteAssetParamsSchema.parse(request.params)

  try {
    const deletePortfolioAssetService = makeDeletePortfolioAssetService()

    await deletePortfolioAssetService.execute({
      assetId,
      userId: request.user.sub
    })

    return reply.status(204).send()
  } catch (err) {
    throw err
  }
}