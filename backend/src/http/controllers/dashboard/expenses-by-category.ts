import { FastifyRequest, FastifyReply } from "fastify"
import { z } from "zod"
import { makeExpensesByCategoryService } from "@/services/factories/make-expenses-by-category-service"

export async function getExpensesByCategory(request: FastifyRequest, reply: FastifyReply) {
  const getExpensesByCategoryParamsSchema = z.object({
    month: z.string(),
    year: z.string()
  })

  const { month, year } = getExpensesByCategoryParamsSchema.parse(request.params)

  try {
    const expensesByCategoryService = makeExpensesByCategoryService()

    const expensesByCategory = await expensesByCategoryService.execute({
      userId: request.user.sub,
      month,
      year: parseInt(year)
    })

    return reply.status(200).send(expensesByCategory)
  } catch (error) {
    console.error("Erro ao buscar gastos por categoria:", error)
    return reply.status(500).send({
      message: "Erro interno do servidor ao buscar gastos por categoria."
    })
  }
}