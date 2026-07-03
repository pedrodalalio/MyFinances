import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { UpdateInstallmentService } from "@/services/update-installment"
import { UpdateFinancialDataCreditCardSubtotalService } from "@/services/update-financial-data-credit-card-subtotal"
import { PrismaCreditCardInstallmentsRepository } from "@/repositories/prisma/prisma-credit-card-installments-repository"
import { PrismaCreditCardPurchasesRepository } from "@/repositories/prisma/prisma-credit-card-purchases-repository"
import { PrismaFinancialDataRepository } from "@/repositories/prisma/prisma-financial-data-repository"

export async function updateInstallment(request: FastifyRequest, reply: FastifyReply) {
  const updateInstallmentParamsSchema = z.object({
    installmentId: z.string()
  })

  const updateInstallmentBodySchema = z.object({
    installment_amount: z.number()
  })

  const { installmentId } = updateInstallmentParamsSchema.parse(request.params)
  const { installment_amount } = updateInstallmentBodySchema.parse(request.body)

  const creditCardInstallmentsRepository = new PrismaCreditCardInstallmentsRepository()
  const creditCardPurchasesRepository = new PrismaCreditCardPurchasesRepository()
  const financialDataRepository = new PrismaFinancialDataRepository()

  const updateFinancialDataCreditCardSubtotalService = new UpdateFinancialDataCreditCardSubtotalService(
    creditCardInstallmentsRepository,
    creditCardPurchasesRepository,
    financialDataRepository
  )

  const updateInstallmentService = new UpdateInstallmentService(
    creditCardInstallmentsRepository,
    updateFinancialDataCreditCardSubtotalService
  )

  const { installment } = await updateInstallmentService.execute({
    installmentId,
    userId: request.user.sub,
    installmentAmount: installment_amount
  })

  return reply.status(200).send({
    installment
  })
}