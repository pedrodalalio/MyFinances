import { parseDateOnly } from "@/utils/date"
import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { CreateTaxService } from "@/services/create-tax"
import { PrismaTaxRepository } from "@/repositories/prisma/prisma-tax-repository"

export async function create(request: FastifyRequest, reply: FastifyReply) {
  const createTaxBodySchema = z.object({
    tax_type: z.enum(['MEI', 'IRPF', 'IPVA', 'IRRF', 'ITR', 'ITCMD', 'IPTU', 'COFINS', 'PIS', 'ICMS', 'ISS', 'IOF', 'OTHER']),
    amount: z.number(),
    payment_method: z.enum(['PIX', 'CASH', 'DEBIT_CARD', 'BANK_TRANSFER', 'OTHER']),
    frequency: z.enum(['MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL']),
    day_of_month: z.number().min(1).max(31),
    month: z.string(),
    year: z.number(),
    due_date: z.string().transform(str => parseDateOnly(str))
  })

  const { tax_type, amount, payment_method, frequency, day_of_month, month, year, due_date } = createTaxBodySchema.parse(request.body)

  const taxRepository = new PrismaTaxRepository()
  const createTaxService = new CreateTaxService(taxRepository)

  const { tax } = await createTaxService.execute({
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

  return reply.status(201).send({
    tax
  })
}