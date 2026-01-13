import { FastifyInstance } from "fastify";
import { createPurchase } from './create-purchase'
import { listPurchases } from './list-purchases'
import { updatePurchase } from './update-purchase'
import { deletePurchase } from './delete-purchase'
import { getMonthlyExpenses } from './get-monthly-expenses'
import { updateInstallment } from './update-installment'
import { listInstallments } from './list-installments'
import { verifyJWT } from "@/http/middlewares/verify-jwt";

export async function creditCardRoutes(app: FastifyInstance) {
  app.addHook('onRequest', verifyJWT)

  app.post("/credit-cards/purchases", createPurchase)
  app.get("/credit-cards/purchases", listPurchases)
  app.get("/credit-cards/purchases/:purchaseId/installments", listInstallments)
  app.get("/credit-cards/monthly-expenses", getMonthlyExpenses)
  app.put("/credit-cards/purchases/:id", updatePurchase)
  app.put("/credit-cards/installments/:installmentId", updateInstallment)
  app.delete("/credit-cards/purchases/:id", deletePurchase)
}