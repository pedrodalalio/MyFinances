import { z } from "zod";
import { FastifyRequest, FastifyReply } from "fastify";
import { DeleteIncomeService } from "@/services/delete-income";
import { PrismaIncomeRepository } from "@/repositories/prisma/prisma-income-repository";

export async function deleteIncome(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const deleteIncomeParamsSchema = z.object({
    id: z.string(),
  });

  const { id } = deleteIncomeParamsSchema.parse(request.params);

  try {
    const incomeRepository = new PrismaIncomeRepository();
    const deleteIncomeService = new DeleteIncomeService(incomeRepository);

    await deleteIncomeService.execute({
      id,
      userId: request.user.sub,
    });

    return reply.status(204).send();
  } catch (error) {
    throw error;
  }
}
