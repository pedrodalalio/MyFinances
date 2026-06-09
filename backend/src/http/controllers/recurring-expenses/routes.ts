import { FastifyInstance } from "fastify"
import { verifyJWT } from "@/http/middlewares/verify-jwt"
import { create } from "./create"
import { list } from "./list"
import { updateFromMonth } from "./update-from-month"
import { deleteFromMonth } from "./delete-from-month"

export async function recurringExpensesRoutes(app: FastifyInstance) {
  app.addHook('onRequest', verifyJWT)

  app.post('/recurring-expenses', create)
  app.get('/recurring-expenses', list)
  app.put('/recurring-expenses/:id', updateFromMonth)
  app.delete('/recurring-expenses/:id', deleteFromMonth)
}
