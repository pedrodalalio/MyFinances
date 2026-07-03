import { parseDateOnly } from "@/utils/date"
import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { UpdateIncomeService } from "@/services/update-income"
import { PrismaIncomeRepository } from "@/repositories/prisma/prisma-income-repository"

export async function update(request: FastifyRequest, reply: FastifyReply) {
  const updateIncomeParamsSchema = z.object({
    id: z.string()
  })

  const updateIncomeBodySchema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    amount: z.number().optional(),
    source: z.string().optional(),
    category: z.string().optional(),
    month: z.string().optional(),
    year: z.number().optional(),
    date: z.string().optional().transform(str => str ? parseDateOnly(str) : undefined)
  })

  const { id } = updateIncomeParamsSchema.parse(request.params)
  const updateData = updateIncomeBodySchema.parse(request.body)

  const incomeRepository = new PrismaIncomeRepository()
  const updateIncomeService = new UpdateIncomeService(incomeRepository)

  const { income } = await updateIncomeService.execute({
    id,
    userId: request.user.sub,
    ...updateData
  })

  return reply.status(200).send({
    income
  })
}
