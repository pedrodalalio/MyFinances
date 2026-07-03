import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { makeDeleteCreditCardPurchaseService } from "@/services/factories/make-delete-credit-card-purchase-service"

export async function deletePurchase(request: FastifyRequest, reply: FastifyReply) {
  const deletePurchaseParamsSchema = z.object({
    id: z.string().uuid(),
  })

  const { id } = deletePurchaseParamsSchema.parse(request.params)

  const deleteCreditCardPurchaseService = makeDeleteCreditCardPurchaseService()

  await deleteCreditCardPurchaseService.execute({
    purchaseId: id,
    userId: request.user.sub
  })

  return reply.status(204).send()
}