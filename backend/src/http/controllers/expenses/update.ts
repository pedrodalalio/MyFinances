import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { UpdateExpenseService } from "@/services/update-expense"
import { PrismaExpenseRepository } from "@/repositories/prisma/prisma-expense-repository"

export async function update(request: FastifyRequest, reply: FastifyReply) {
  const updateExpenseParamsSchema = z.object({
    id: z.string()
  })

  const updateExpenseBodySchema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    amount: z.number().optional(),
    payment_method: z.enum(['PIX', 'CASH', 'DEBIT_CARD', 'BANK_TRANSFER', 'OTHER']).optional(),
    category: z.string().optional(),
    month: z.string().optional(),
    year: z.number().optional(),
    date: z.string().optional().transform(str => str ? new Date(str + "T12:00:00Z") : undefined)
  })

  const { id } = updateExpenseParamsSchema.parse(request.params)
  const updateData = updateExpenseBodySchema.parse(request.body)

  try {
    const expenseRepository = new PrismaExpenseRepository()
    const updateExpenseService = new UpdateExpenseService(expenseRepository)

    const { expense } = await updateExpenseService.execute({
      id,
      userId: request.user.sub,
      ...updateData,
      paymentMethod: updateData.payment_method
    })

    return reply.status(200).send({
      expense
    })
  } catch (error) {
    throw error
  }
}