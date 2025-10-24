import { FastifyInstance } from "fastify";
import { createSalaryProfile } from './create-salary-profile'
import { listSalaryProfiles } from './list-salary-profiles'
import { getCurrentSalary } from './get-current-salary'
import { verifyJWT } from "@/http/middlewares/verify-jwt";

export async function salaryRoutes(app: FastifyInstance) {
  app.addHook('onRequest', verifyJWT)

  app.post("/salary/profiles", createSalaryProfile)
  app.get("/salary/profiles", listSalaryProfiles)
  app.get("/salary/current", getCurrentSalary)
}