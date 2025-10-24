import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { DeleteTaxService } from "@/services/delete-tax"
import { PrismaTaxRepository } from "@/repositories/prisma/prisma-tax-repository"
import { ResourceNotFoundError } from "@/services/errors/resource-not-found-error"

export async function deleteTax(request: FastifyRequest, reply: FastifyReply) {
  const deleteTaxParamsSchema = z.object({
    id: z.string().uuid()
  })

  const { id } = deleteTaxParamsSchema.parse(request.params)

  try {
    const taxRepository = new PrismaTaxRepository()
    const deleteTaxService = new DeleteTaxService(taxRepository)

    await deleteTaxService.execute({
      id,
      userId: request.user.sub
    })

    return reply.status(204).send()
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return reply.status(404).send({ message: error.message })
    }

    throw error
  }
}