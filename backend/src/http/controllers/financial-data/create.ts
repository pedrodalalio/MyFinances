import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { CreateFinancialDataService } from "@/services/create-financial-data"
import { PrismaFinancialDataRepository } from "@/repositories/prisma/prisma-financial-data-repository"

export async function create(request: FastifyRequest, reply: FastifyReply) {
  const createFinancialDataBodySchema = z.object({
    month: z.string(),
    year: z.number(),
    mainIncome: z.number().optional().default(0),
    checkingAccount: z.number().optional().default(0)
  })

  const { month, year, mainIncome, checkingAccount } = createFinancialDataBodySchema.parse(request.body)

  try {
    const financialDataRepository = new PrismaFinancialDataRepository()
    const createFinancialDataService = new CreateFinancialDataService(financialDataRepository)

    const { financialData } = await createFinancialDataService.execute({
      userId: request.user.sub,
      month,
      year,
      mainIncome,
      checkingAccount
    })

    return reply.status(201).send({
      financialData
    })
  } catch (error) {
    throw error
  }
}