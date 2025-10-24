import { FastifyInstance } from "fastify"
import { verifyJWT } from "@/http/middlewares/verify-jwt"
import { create } from "./create"
import { getByMonth } from "./get-by-month"
import { update } from "./update"
import { deleteMonthlyInvestment } from "./delete"

export async function monthlyInvestmentsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', verifyJWT)

  app.post('/monthly-investments', create)
  app.get('/monthly-investments/:month/:year', getByMonth)
  app.put('/monthly-investments/:id', update)
  app.delete('/monthly-investments/:id', deleteMonthlyInvestment)
}