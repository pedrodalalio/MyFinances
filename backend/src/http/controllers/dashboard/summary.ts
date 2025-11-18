import { FastifyRequest, FastifyReply } from "fastify"
import { z } from "zod"
import { makeDashboardSummaryService } from "@/services/factories/make-dashboard-summary-service"

export async function getDashboardSummary(request: FastifyRequest, reply: FastifyReply) {
  const getDashboardSummaryQuerySchema = z.object({
    month: z.string().optional(),
    year: z.string().optional(),
  })

  const { month, year } = getDashboardSummaryQuerySchema.parse(request.query)

  const currentDate = new Date()
  const currentMonth = month || (currentDate.getMonth() + 1).toString().padStart(2, '0')
  const currentYear = year || currentDate.getFullYear().toString()

  try {
    const dashboardSummaryService = makeDashboardSummaryService()

    const summary = await dashboardSummaryService.execute({
      userId: request.user.sub,
      month: currentMonth,
      year: parseInt(currentYear)
    })

    return reply.status(200).send(summary)
  } catch (error) {
    console.error("Erro ao buscar resumo do dashboard:", error)
    return reply.status(500).send({
      message: "Erro interno do servidor ao buscar resumo do dashboard."
    })
  }
}