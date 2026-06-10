import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { DeleteRecurringExpenseFromMonthService } from "@/services/delete-recurring-expense-from-month"
import { PrismaRecurringExpenseRepository } from "@/repositories/prisma/prisma-recurring-expense-repository"
import { ResourceNotFoundError } from "@/services/errors/resource-not-found-error"
import { InvalidEffectiveMonthError } from "@/services/errors/invalid-effective-month-error"

export async function deleteFromMonth(request: FastifyRequest, reply: FastifyReply) {
  const paramsSchema = z.object({ id: z.string() })
  const querySchema = z.object({
    month: z.string().regex(/^(0[1-9]|1[0-2])$/, 'month must be 01-12'),
    year: z.coerce.number().int(),
  })

  const { id } = paramsSchema.parse(request.params)
  const { month, year } = querySchema.parse(request.query)

  try {
    const recurringExpenseRepository = new PrismaRecurringExpenseRepository()
    const service = new DeleteRecurringExpenseFromMonthService(recurringExpenseRepository)

    await service.execute({
      id,
      userId: request.user.sub,
      effectiveMonth: month,
      effectiveYear: year,
    })

    return reply.status(204).send()
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
