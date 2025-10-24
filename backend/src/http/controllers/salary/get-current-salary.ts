import { FastifyRequest, FastifyReply } from "fastify"
import { makeGetCurrentSalaryService } from "@/services/factories/make-get-current-salary-service"

export async function getCurrentSalary(request: FastifyRequest, reply: FastifyReply) {
  try {
    const getCurrentSalaryService = makeGetCurrentSalaryService()

    const currentSalary = await getCurrentSalaryService.execute({
      userId: request.user.sub
    })

    return reply.status(200).send(currentSalary)
  } catch (error) {
    throw error
  }
}