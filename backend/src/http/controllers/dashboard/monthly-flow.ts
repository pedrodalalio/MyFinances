import { FastifyRequest, FastifyReply } from "fastify"
import { z } from "zod"
import { makeMonthlyFlowService } from "@/services/factories/make-monthly-flow-service"

export async function getMonthlyFlow(request: FastifyRequest, reply: FastifyReply) {
  const getMonthlyFlowParamsSchema = z.object({
    year: z.string()
  })

  const { year } = getMonthlyFlowParamsSchema.parse(request.params)

  try {
    const monthlyFlowService = makeMonthlyFlowService()

    const monthlyFlow = await monthlyFlowService.execute({
      userId: request.user.sub,
      year: parseInt(year)
    })

    return reply.status(200).send(monthlyFlow)
  } catch (error) {
    console.error("Erro ao buscar fluxo mensal:", error)
    return reply.status(500).send({
      message: "Erro interno do servidor ao buscar fluxo mensal."
    })
  }
}