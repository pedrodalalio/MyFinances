import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { makeCreateSalaryProfileService } from "@/services/factories/make-create-salary-profile-service"

export async function createSalaryProfile(request: FastifyRequest, reply: FastifyReply) {
  const createSalaryProfileBodySchema = z.object({
    amount: z.number().positive(),
    description: z.string().optional(),
    start_date: z.string().transform(val => new Date(val)),
    end_date: z.string().transform(val => new Date(val)).optional(),
  })

  const data = createSalaryProfileBodySchema.parse(request.body)

  try {
    const createSalaryProfileService = makeCreateSalaryProfileService()

    const salaryProfile = await createSalaryProfileService.execute({
      ...data,
      userId: request.user.sub
    })

    return reply.status(201).send(salaryProfile)
  } catch (error) {
    throw error
  }
}