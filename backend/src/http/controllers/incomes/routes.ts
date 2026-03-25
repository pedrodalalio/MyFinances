import { FastifyInstance } from "fastify"
import { verifyJWT } from "@/http/middlewares/verify-jwt"
import { create } from "./create"
import { getByMonth } from "./get-by-month"
import { update } from "./update"
import { deleteIncome } from "./delete"

export async function incomesRoutes(app: FastifyInstance) {
  app.addHook('onRequest', verifyJWT)

  app.post('/incomes', create)
  app.get('/incomes/:month/:year', getByMonth)
  app.put('/incomes/:id', update)
  app.delete('/incomes/:id', deleteIncome)
}
