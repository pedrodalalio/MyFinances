import { FastifyInstance } from "fastify"
import { verifyJWT } from "@/http/middlewares/verify-jwt"
import { create } from "./create"
import { getByMonth } from "./get-by-month"
import { update } from "./update"
import { deleteExpense } from "./delete"

export async function expensesRoutes(app: FastifyInstance) {
  app.addHook('onRequest', verifyJWT)

  app.post('/expenses', create)
  app.get('/expenses/:month/:year', getByMonth)
  app.put('/expenses/:id', update)
  app.delete('/expenses/:id', deleteExpense)
}