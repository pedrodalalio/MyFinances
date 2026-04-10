import { FastifyInstance } from "fastify"
import { verifyJWT } from "@/http/middlewares/verify-jwt"
import { create } from "./create"
import { getByMonth } from "./get-by-month"
import { update } from "./update"
import { deleteInvestment } from "./delete"
import { getPortfolio } from "./get-portfolio"
import { getInvestmentHistory } from "./get-history"

export async function monthlyInvestmentsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', verifyJWT)

  // Monthly investments routes (existing)
  app.post('/monthly-investments', create)
  app.get('/monthly-investments/:month/:year', getByMonth)
  app.put('/monthly-investments/:id', update)
  app.delete('/monthly-investments/:id', deleteInvestment)

  // Portfolio unified routes (new)
  app.get('/investments/portfolio', getPortfolio)
  app.get('/investments/history', getInvestmentHistory)
}