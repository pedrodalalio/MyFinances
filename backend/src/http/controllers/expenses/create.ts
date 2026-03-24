import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { CreateExpenseService } from "@/services/create-expense"
import { PrismaExpenseRepository } from "@/repositories/prisma/prisma-expense-repository"

export async function create(request: FastifyRequest, reply: FastifyReply) {
  const createExpenseBodySchema = z.object({
    name: z.string(),
    description: z.string().optional(),
    amount: z.number(),
    payment_method: z.enum(['PIX', 'CASH', 'DEBIT_CARD', 'BANK_TRANSFER', 'OTHER']),
    category: z.string().optional(),
    month: z.string(),
    year: z.number(),
    date: z.string().optional().transform(str => str ? new Date(str + "T12:00:00Z") : new Date())
  })

  const { name, description, amount, payment_method, category, month, year, date } = createExpenseBodySchema.parse(request.body)

  try {
    const expenseRepository = new PrismaExpenseRepository()
    const createExpenseService = new CreateExpenseService(expenseRepository)

    const { expense } = await createExpenseService.execute({
      userId: request.user.sub,
      name,
      description,
      amount,
      paymentMethod: payment_method,
      category,
      month,
      year,
      date
    })

    return reply.status(201).send({
      expense
    })
  } catch (error) {
    throw error
  }
}