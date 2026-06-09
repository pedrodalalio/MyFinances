import { FastifyRequest, FastifyReply } from "fastify"
import { ListRecurringExpensesService } from "@/services/list-recurring-expenses"
import { PrismaRecurringExpenseRepository } from "@/repositories/prisma/prisma-recurring-expense-repository"

export async function list(request: FastifyRequest, reply: FastifyReply) {
  const recurringExpenseRepository = new PrismaRecurringExpenseRepository()
  const service = new ListRecurringExpensesService(recurringExpenseRepository)

  const { recurringExpenses } = await service.execute({
    userId: request.user.sub,
  })

  return reply.status(200).send({ recurringExpenses })
}
