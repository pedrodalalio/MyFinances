import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { UpdateMonthlyValuesService } from "@/services/update-monthly-values"
import { PrismaFinancialDataRepository } from "@/repositories/prisma/prisma-financial-data-repository"

export async function updateMonthlyValues(request: FastifyRequest, reply: FastifyReply) {
  const updateMonthlyValuesParamsSchema = z.object({
    month: z.string().regex(/^(0[1-9]|1[0-2])$/, "Mês deve estar no formato MM"),
    year: z.string().transform(val => parseInt(val))
  })

  const updateMonthlyValuesBodySchema = z.object({
    main_income: z.number().optional(),
    checking_account: z.number().optional(),
    previous_balance: z.number().optional()
  })

  const { month, year } = updateMonthlyValuesParamsSchema.parse(request.params)
  const updateData = updateMonthlyValuesBodySchema.parse(request.body)

  try {
    const financialDataRepository = new PrismaFinancialDataRepository()
    const updateMonthlyValuesService = new UpdateMonthlyValuesService(financialDataRepository)

    const { financialData } = await updateMonthlyValuesService.execute({
      userId: request.user.sub,
      month,
      year,
      ...updateData
    })

    return reply.status(200).send({
      financialData
    })
  } catch (error) {
    throw error
  }
}