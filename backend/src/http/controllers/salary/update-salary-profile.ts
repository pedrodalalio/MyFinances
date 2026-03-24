import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { makeUpdateSalaryProfileService } from "@/services/factories/make-update-salary-profile-service"

export async function updateSalaryProfile(request: FastifyRequest, reply: FastifyReply) {
  const paramsSchema = z.object({
    id: z.string().uuid(),
  })

  const bodySchema = z.object({
    amount: z.number().positive(),
    description: z.string().optional(),
    start_date: z.string().transform(val => new Date(val)),
    end_date: z.string().transform(val => new Date(val)).optional(),
  })

  const { id } = paramsSchema.parse(request.params)
  const data = bodySchema.parse(request.body)

  try {
    const service = makeUpdateSalaryProfileService()

    const salaryProfile = await service.execute({
      id,
      ...data,
      userId: request.user.sub,
    })

    return reply.status(200).send(salaryProfile)
  } catch (error) {
    throw error
  }
}
