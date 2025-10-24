import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { GetExpensesByMonthService } from "@/services/get-expenses-by-month"
import { PrismaExpenseRepository } from "@/repositories/prisma/prisma-expense-repository"

export async function getByMonth(request: FastifyRequest, reply: FastifyReply) {
  const getExpensesByMonthParamsSchema = z.object({
    month: z.string(),
    year: z.string().transform(str => parseInt(str))
  })

  const { month, year } = getExpensesByMonthParamsSchema.parse(request.params)

  try {
    const expenseRepository = new PrismaExpenseRepository()
    const getExpensesByMonthService = new GetExpensesByMonthService(expenseRepository)

    const { expenses } = await getExpensesByMonthService.execute({
      userId: request.user.sub,
      month,
      year
    })

    return reply.status(200).send({
      expenses
    })
  } catch (error) {
    throw error
  }
}