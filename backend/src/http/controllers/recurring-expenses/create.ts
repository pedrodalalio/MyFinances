import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { CreateRecurringExpenseService } from "@/services/create-recurring-expense"
import { PrismaRecurringExpenseRepository } from "@/repositories/prisma/prisma-recurring-expense-repository"

export async function create(request: FastifyRequest, reply: FastifyReply) {
  const createBodySchema = z.object({
    name: z.string(),
    description: z.string().optional(),
    amount: z.number().positive(),
    payment_method: z.enum(['PIX', 'CASH', 'DEBIT_CARD', 'BANK_TRANSFER', 'OTHER']),
    category: z.string().optional(),
    day_of_month: z.number().int().min(1).max(31).default(1),
    start_month: z.string(),
    start_year: z.number().int(),
    end_month: z.string().nullish(),
    end_year: z.number().int().nullish(),
  })

  const data = createBodySchema.parse(request.body)

  const recurringExpenseRepository = new PrismaRecurringExpenseRepository()
  const createRecurringExpenseService = new CreateRecurringExpenseService(recurringExpenseRepository)

  const { recurringExpense } = await createRecurringExpenseService.execute({
    userId: request.user.sub,
    name: data.name,
    description: data.description,
    amount: data.amount,
    paymentMethod: data.payment_method,
    category: data.category,
    dayOfMonth: data.day_of_month,
    startMonth: data.start_month,
    startYear: data.start_year,
    endMonth: data.end_month,
    endYear: data.end_year,
  })

  return reply.status(201).send({ recurringExpense })
}
