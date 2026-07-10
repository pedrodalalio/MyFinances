import { FastifyInstance } from "fastify"
import { verifyJWT } from "@/http/middlewares/verify-jwt"
import { upload } from "./upload"
import { list } from "./list"
import { getTransactions } from "./get-transactions"
import { updateTransaction } from "./update-transaction"
import { confirmTransaction } from "./confirm-transaction"
import { linkPayments } from "./link-payments"
import { confirmImport } from "./confirm-import"
import { deleteImport } from "./delete-import"

export async function importsRoutes(app: FastifyInstance) {
  app.addHook("onRequest", verifyJWT)

  app.post("/imports/upload", upload)
  app.get("/imports", list)
  app.get("/imports/:importId", getTransactions)
  app.put("/imports/transactions/:transactionId", updateTransaction)
  app.post("/imports/transactions/:transactionId/confirm", confirmTransaction)
  app.post("/imports/transactions/:transactionId/link-payments", linkPayments)
  app.post("/imports/:importId/confirm", confirmImport)
  app.delete("/imports/:importId", deleteImport)
}
