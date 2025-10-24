import { FastifyRequest, FastifyReply } from "fastify"
import { PrismaFinancialDataRepository } from "@/repositories/prisma/prisma-financial-data-repository"

export async function list(request: FastifyRequest, reply: FastifyReply) {
  try {
    const financialDataRepository = new PrismaFinancialDataRepository()

    const financialData = await financialDataRepository.findManyByUser(request.user.sub)

    return reply.status(200).send({
      financialData
    })
  } catch (error) {
    throw error
  }
}