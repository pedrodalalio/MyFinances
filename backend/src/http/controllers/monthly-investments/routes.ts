import { FastifyInstance } from "fastify"
import { verifyJWT } from "@/http/middlewares/verify-jwt"
import { create } from "./create"
import { getByMonth } from "./get-by-month"
import { update } from "./update"
import { deleteInvestment } from "./delete"
import { getPortfolio } from "./get-portfolio"
import { getInvestmentHistory } from "./get-history"
import { listMatured } from "./list-matured"
import { redeem } from "./redeem"
import { getQuotes } from "./get-quotes"
import { getFiiIncome } from "./get-fii-income"
import { getFiiLookup } from "./get-fii-lookup"
import { importStatement } from "./import-statement"

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
  app.get('/investments/matured', listMatured)
  app.post('/investments/:id/redeem', redeem)
  app.get('/investments/quotes', getQuotes)
  app.get('/investments/fii-income', getFiiIncome)
  app.get('/investments/fii-lookup/:ticker', getFiiLookup)
  app.post('/investments/import-statement', importStatement)
}