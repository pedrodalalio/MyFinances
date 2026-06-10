import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { CreateRecurringExpenseService } from "@/services/create-recurring-expense"
import { PrismaRecurringExpenseRepository } from "@/repositories/prisma/prisma-recurring-expense-repository"

const monthSchema = z.string().regex(/^(0[1-9]|1[0-2])$/, 'month must be 01-12')

export async function create(request: FastifyRequest, reply: FastifyReply) {
  const createBodySchema = z
    .object({
      name: z.string(),
      description: z.string().optional(),
      amount: z.number().positive(),
      payment_method: z.enum(['PIX', 'CASH', 'DEBIT_CARD', 'BANK_TRANSFER', 'OTHER']),
      category: z.string().optional(),
      day_of_month: z.number().int().min(1).max(31).default(1),
      start_month: monthSchema,
      start_year: z.number().int(),
      end_month: monthSchema.nullish(),
      end_year: z.number().int().nullish(),
    })
    .refine(
      (body) => {
        if (!body.end_month || !body.end_year) return true
        const start = new Date(body.start_year, parseInt(body.start_month) - 1)
        const end = new Date(body.end_year, parseInt(body.end_month) - 1)
        return end >= start
      },
      { message: 'end must be on or after start', path: ['end_month'] },
    )

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
