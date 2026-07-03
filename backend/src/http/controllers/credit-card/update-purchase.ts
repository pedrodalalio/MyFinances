import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { makeUpdateCreditCardPurchaseService } from "@/services/factories/make-update-credit-card-purchase-service"

export async function updatePurchase(request: FastifyRequest, reply: FastifyReply) {
  const updatePurchaseParamsSchema = z.object({
    id: z.string().uuid(),
  })

  const updatePurchaseBodySchema = z.object({
    name: z.string(),
    description: z.string().optional(),
    total_amount: z.number().positive(),
    installments: z.number().int().positive().optional(),
    start_month: z.string(),
    start_year: z.number().int(),
    end_month: z.string().optional(),
    end_year: z.number().int().optional(),
    category: z.string().optional(),
    is_recurring: z.boolean().default(false),
  })

  const { id } = updatePurchaseParamsSchema.parse(request.params)
  const data = updatePurchaseBodySchema.parse(request.body)

  const updateCreditCardPurchaseService = makeUpdateCreditCardPurchaseService()

  const purchase = await updateCreditCardPurchaseService.execute({
    id,
    ...data,
    userId: request.user.sub,
    installment_amount: data.is_recurring ? data.total_amount : Math.round((data.total_amount / (data.installments || 1)) * 100) / 100
  })

  return reply.status(200).send(purchase)
}