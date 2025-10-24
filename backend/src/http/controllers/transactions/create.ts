import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { AddTransactionService } from "@/services/add-transaction"
import { PrismaFinancialDataRepository } from "@/repositories/prisma/prisma-financial-data-repository"
import { PrismaTransactionsRepository } from "@/repositories/prisma/prisma-transactions-repository"
import { TransactionType } from "@prisma/client"

export async function create(request: FastifyRequest, reply: FastifyReply) {
  const createTransactionBodySchema = z.object({
    month: z.string(),
    year: z.number(),
    name: z.string(),
    actualCost: z.number(),
    type: z.nativeEnum(TransactionType)
  })

  const { month, year, name, actualCost, type } = createTransactionBodySchema.parse(request.body)

  try {
    const financialDataRepository = new PrismaFinancialDataRepository()
    const transactionsRepository = new PrismaTransactionsRepository()
    const addTransactionService = new AddTransactionService(
      financialDataRepository,
      transactionsRepository
    )

    const { transaction } = await addTransactionService.execute({
      userId: request.user.sub,
      month,
      year,
      name,
      actualCost,
      type
    })

    return reply.status(201).send({
      transaction
    })
  } catch (error) {
    throw error
  }
}