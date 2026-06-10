import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { UpdateRecurringExpenseFromMonthService } from "@/services/update-recurring-expense-from-month"
import { PrismaRecurringExpenseRepository } from "@/repositories/prisma/prisma-recurring-expense-repository"
import { ResourceNotFoundError } from "@/services/errors/resource-not-found-error"
import { InvalidEffectiveMonthError } from "@/services/errors/invalid-effective-month-error"

export async function updateFromMonth(request: FastifyRequest, reply: FastifyReply) {
  const paramsSchema = z.object({ id: z.string() })

  const bodySchema = z.object({
    effective_month: z.string().regex(/^(0[1-9]|1[0-2])$/, 'month must be 01-12'),
    effective_year: z.number().int(),
    name: z.string().optional(),
    description: z.string().optional(),
    amount: z.number().positive().optional(),
    payment_method: z.enum(['PIX', 'CASH', 'DEBIT_CARD', 'BANK_TRANSFER', 'OTHER']).optional(),
    category: z.string().optional(),
    day_of_month: z.number().int().min(1).max(31).optional(),
  })

  const { id } = paramsSchema.parse(request.params)
  const data = bodySchema.parse(request.body)

  try {
    const recurringExpenseRepository = new PrismaRecurringExpenseRepository()
    const service = new UpdateRecurringExpenseFromMonthService(recurringExpenseRepository)

    const { recurringExpense } = await service.execute({
      id,
      userId: request.user.sub,
      effectiveMonth: data.effective_month,
      effectiveYear: data.effective_year,
      name: data.name,
      description: data.description,
      amount: data.amount,
      paymentMethod: data.payment_method,
      category: data.category,
      dayOfMonth: data.day_of_month,
    })

    return reply.status(200).send({ recurringExpense })
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }
    if (error instanceof InvalidEffectiveMonthError) {
      return reply.status(400).send({ message: error.message })
    }
    throw error
  }
}
