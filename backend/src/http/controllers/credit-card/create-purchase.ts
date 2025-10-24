import { z } from "zod";
import { FastifyRequest, FastifyReply } from "fastify";
import { makeCreateCreditCardPurchaseService } from "@/services/factories/make-create-credit-card-purchase-service";

export async function createPurchase(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const createPurchaseBodySchema = z.object({
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
  });

  const data = createPurchaseBodySchema.parse(request.body);

  try {
    const createCreditCardPurchaseService =
      makeCreateCreditCardPurchaseService();

    const purchase = await createCreditCardPurchaseService.execute({
      ...data,
      userId: request.user.sub,
      installment_amount: data.is_recurring
        ? data.total_amount
        : Math.round((data.total_amount / (data.installments || 1)) * 100) /
          100,
    });

    return reply.status(201).send(purchase);
  } catch (error) {
    throw error;
  }
}
