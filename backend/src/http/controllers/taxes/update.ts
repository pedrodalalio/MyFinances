import { parseDateOnly } from "@/utils/date"
import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { UpdateTaxService } from "@/services/update-tax"
import { PrismaTaxRepository } from "@/repositories/prisma/prisma-tax-repository"
import { ResourceNotFoundError } from "@/services/errors/resource-not-found-error"

export async function update(request: FastifyRequest, reply: FastifyReply) {
  const updateTaxParamsSchema = z.object({
    id: z.string().uuid()
  })

  const updateTaxBodySchema = z.object({
    tax_type: z.enum(['MEI', 'IRPF', 'IPVA', 'IRRF', 'ITR', 'ITCMD', 'IPTU', 'COFINS', 'PIS', 'ICMS', 'ISS', 'IOF', 'OTHER']).optional(),
    amount: z.number().optional(),
    payment_method: z.enum(['PIX', 'CASH', 'DEBIT_CARD', 'BANK_TRANSFER', 'OTHER']).optional(),
    frequency: z.enum(['MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL']).optional(),
    day_of_month: z.number().min(1).max(31).optional(),
    month: z.string().optional(),
    year: z.number().optional(),
    due_date: z.string().transform(str => str ? parseDateOnly(str) : undefined).optional()
  })

  const { id } = updateTaxParamsSchema.parse(request.params)
  const { tax_type, amount, payment_method, frequency, day_of_month, month, year, due_date } = updateTaxBodySchema.parse(request.body)

  try {
    const taxRepository = new PrismaTaxRepository()
    const updateTaxService = new UpdateTaxService(taxRepository)

    const { tax } = await updateTaxService.execute({
      id,
      userId: request.user.sub,
      taxType: tax_type,
      amount,
      paymentMethod: payment_method,
      frequency,
      dayOfMonth: day_of_month,
      month,
      year,
      dueDate: due_date
    })

    return reply.status(200).send({
      tax
    })
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }

    throw error
  }
}