import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { TransferBalanceToNextMonthService } from "@/services/transfer-balance-to-next-month"
import { PrismaFinancialDataRepository } from "@/repositories/prisma/prisma-financial-data-repository"

export async function transferBalance(request: FastifyRequest, reply: FastifyReply) {
  const transferBalanceParamsSchema = z.object({
    month: z.string().regex(/^(0[1-9]|1[0-2])$/, "Mês deve estar no formato MM"),
    year: z.string().transform(val => parseInt(val))
  })

  const { month, year } = transferBalanceParamsSchema.parse(request.params)

  try {
    const financialDataRepository = new PrismaFinancialDataRepository()
    const transferBalanceService = new TransferBalanceToNextMonthService(financialDataRepository)

    await transferBalanceService.execute({
      userId: request.user.sub,
      fromMonth: month,
      fromYear: year
    })

    return reply.status(200).send({
      message: "Saldo transferido com sucesso para o próximo mês"
    })
  } catch (error) {
    throw error
  }
}