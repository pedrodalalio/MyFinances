import { FastifyInstance } from "fastify";
import { verifyJWT } from "@/http/middlewares/verify-jwt";
import { create } from "./create";
import { get } from "./get";
import { list } from "./list";
import { updateMonthlyValues } from "./update-monthly-values";
import { transferBalance } from "./transfer-balance";
import { confirmMonth } from "./confirm-month";
import { getFinancialOverview } from "../financial/get-financial-overview";

export async function financialDataRoutes(app: FastifyInstance) {
  app.addHook("onRequest", verifyJWT)

  app.post("/financial-data", create)
  app.get("/financial-data/:month/:year", get)
  app.get("/financial-data", list)
  app.put("/financial-data/:month/:year", updateMonthlyValues)
  app.post("/financial-data/:month/:year/transfer-balance", transferBalance)
  app.post("/financial-data/confirm-month/:month/:year", confirmMonth)
  app.get("/financial-overview/:month/:year", getFinancialOverview)
}