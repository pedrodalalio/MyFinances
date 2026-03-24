import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { makeDeleteSalaryProfileService } from "@/services/factories/make-delete-salary-profile-service"

export async function deleteSalaryProfile(request: FastifyRequest, reply: FastifyReply) {
  const paramsSchema = z.object({
    id: z.string().uuid(),
  })

  const { id } = paramsSchema.parse(request.params)

  try {
    const service = makeDeleteSalaryProfileService()

    await service.execute({
      id,
      userId: request.user.sub,
    })

    return reply.status(204).send()
  } catch (error) {
    throw error
  }
}
