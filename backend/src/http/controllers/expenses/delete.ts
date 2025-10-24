import { z } from "zod";
import { FastifyRequest, FastifyReply } from "fastify";
import { DeleteExpenseService } from "@/services/delete-expense";
import { PrismaExpenseRepository } from "@/repositories/prisma/prisma-expense-repository";

export async function deleteExpense(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const deleteExpenseParamsSchema = z.object({
    id: z.string(),
  });

  const { id } = deleteExpenseParamsSchema.parse(request.params);

  try {
    const expenseRepository = new PrismaExpenseRepository();
    const deleteExpenseService = new DeleteExpenseService(expenseRepository);

    await deleteExpenseService.execute({
      id,
      userId: request.user.sub,
    });

    return reply.status(204).send();
  } catch (error) {
    throw error;
  }
}
