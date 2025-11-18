import { FastifyInstance } from "fastify"
import { verifyJWT } from "@/http/middlewares/verify-jwt"
import { getDashboardSummary } from "./summary"
import { getMonthlyFlow } from "./monthly-flow"
import { getExpensesByCategory } from "./expenses-by-category"

export async function dashboardRoutes(app: FastifyInstance) {
  app.addHook('onRequest', verifyJWT)

  app.get('/dashboard/summary', getDashboardSummary)
  app.get('/dashboard/monthly-flow/:year', getMonthlyFlow)
  app.get('/dashboard/expenses-by-category/:month/:year', getExpensesByCategory)
}