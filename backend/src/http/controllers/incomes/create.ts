import { parseDateOnly } from "@/utils/date"
import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { CreateIncomeService } from "@/services/create-income"
import { PrismaIncomeRepository } from "@/repositories/prisma/prisma-income-repository"

export async function create(request: FastifyRequest, reply: FastifyReply) {
  const createIncomeBodySchema = z.object({
    name: z.string(),
    description: z.string().optional(),
    amount: z.number(),
    source: z.string().optional(),
    category: z.string().optional(),
    month: z.string(),
    year: z.number(),
    date: z.string().optional().transform(str => str ? parseDateOnly(str) : new Date())
  })

  const { name, description, amount, source, category, month, year, date } = createIncomeBodySchema.parse(request.body)

  try {
    const incomeRepository = new PrismaIncomeRepository()
    const createIncomeService = new CreateIncomeService(incomeRepository)

    const { income } = await createIncomeService.execute({
      userId: request.user.sub,
      name,
      description,
      amount,
      source,
      category,
      month,
      year,
      date
    })

    return reply.status(201).send({
      income
    })
  } catch (error) {
    throw error
  }
}
