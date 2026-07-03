import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { makeGetMonthlyExpensesService } from "@/services/factories/make-get-monthly-expenses-service"

export async function getMonthlyExpenses(request: FastifyRequest, reply: FastifyReply) {
  const getMonthlyExpensesQuerySchema = z.object({
    month: z.string().regex(/^(0[1-9]|1[0-2])$/, "Mês deve estar no formato MM"),
    year: z.string().transform(val => parseInt(val))
  })

  const { month, year } = getMonthlyExpensesQuerySchema.parse(request.query)

  const getMonthlyExpensesService = makeGetMonthlyExpensesService()

  const expenses = await getMonthlyExpensesService.execute({
    userId: request.user.sub,
    month,
    year
  })

  return reply.status(200).send(expenses)
}