import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { ListInstallmentsByPurchaseService } from "@/services/list-installments-by-purchase"
import { PrismaCreditCardInstallmentsRepository } from "@/repositories/prisma/prisma-credit-card-installments-repository"
import { PrismaCreditCardPurchasesRepository } from "@/repositories/prisma/prisma-credit-card-purchases-repository"

export async function listInstallments(request: FastifyRequest, reply: FastifyReply) {
  const listInstallmentsParamsSchema = z.object({
    purchaseId: z.string()
  })

  const { purchaseId } = listInstallmentsParamsSchema.parse(request.params)

  try {
    const creditCardInstallmentsRepository = new PrismaCreditCardInstallmentsRepository()
    const creditCardPurchasesRepository = new PrismaCreditCardPurchasesRepository()

    const listInstallmentsByPurchaseService = new ListInstallmentsByPurchaseService(
      creditCardInstallmentsRepository,
      creditCardPurchasesRepository
    )

    const { installments } = await listInstallmentsByPurchaseService.execute({
      purchaseId,
      userId: request.user.sub
    })

    return reply.status(200).send({
      installments
    })
  } catch (error) {
    throw error
  }
}
