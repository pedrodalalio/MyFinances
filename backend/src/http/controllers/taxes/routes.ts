import { FastifyInstance } from "fastify"
import { verifyJWT } from "@/http/middlewares/verify-jwt"
import { create } from "./create"
import { getByMonth } from "./get-by-month"
import { update } from "./update"
import { deleteTax } from "./delete"

export async function taxesRoutes(app: FastifyInstance) {
  app.addHook('onRequest', verifyJWT)

  app.post('/taxes', create)
  app.get('/taxes/:month/:year', getByMonth)
  app.put('/taxes/:id', update)
  app.delete('/taxes/:id', deleteTax)
}