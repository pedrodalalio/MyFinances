import { FastifyRequest, FastifyReply } from "fastify"
import { makeListSalaryProfilesService } from "@/services/factories/make-list-salary-profiles-service"

export async function listSalaryProfiles(request: FastifyRequest, reply: FastifyReply) {
  try {
    const listSalaryProfilesService = makeListSalaryProfilesService()

    const salaryProfiles = await listSalaryProfilesService.execute({
      userId: request.user.sub
    })

    return reply.status(200).send(salaryProfiles)
  } catch (error) {
    throw error
  }
}