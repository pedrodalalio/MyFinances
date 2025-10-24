import { FastifyRequest, FastifyReply } from "fastify"
import { makeListCreditCardPurchasesService } from "@/services/factories/make-list-credit-card-purchases-service"

export async function listPurchases(request: FastifyRequest, reply: FastifyReply) {
  try {
    const listCreditCardPurchasesService = makeListCreditCardPurchasesService()

    const purchases = await listCreditCardPurchasesService.execute({
      userId: request.user.sub
    })

    return reply.status(200).send(purchases)
  } catch (error) {
    throw error
  }
}