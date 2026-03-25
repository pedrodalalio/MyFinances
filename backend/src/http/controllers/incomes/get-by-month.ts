import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { GetIncomesByMonthService } from "@/services/get-incomes-by-month"
import { PrismaIncomeRepository } from "@/repositories/prisma/prisma-income-repository"

export async function getByMonth(request: FastifyRequest, reply: FastifyReply) {
  const getIncomesByMonthParamsSchema = z.object({
    month: z.string(),
    year: z.string().transform(str => parseInt(str))
  })

  const { month, year } = getIncomesByMonthParamsSchema.parse(request.params)

  try {
    const incomeRepository = new PrismaIncomeRepository()
    const getIncomesByMonthService = new GetIncomesByMonthService(incomeRepository)

    const { incomes } = await getIncomesByMonthService.execute({
      userId: request.user.sub,
      month,
      year
    })

    return reply.status(200).send({
      incomes
    })
  } catch (error) {
    throw error
  }
}
