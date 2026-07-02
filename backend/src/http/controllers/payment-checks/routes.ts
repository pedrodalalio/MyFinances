import { FastifyInstance } from "fastify"
import { verifyJWT } from "@/http/middlewares/verify-jwt"
import { getByMonth } from "./get-by-month"
import { set } from "./set"

export async function paymentChecksRoutes(app: FastifyInstance) {
  app.addHook('onRequest', verifyJWT)

  app.get('/payment-checks/:month/:year', getByMonth)
  app.put('/payment-checks', set)
}
