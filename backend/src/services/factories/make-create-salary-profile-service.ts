import { PrismaSalaryProfilesRepository } from "@/repositories/prisma/prisma-salary-profiles-repository"
import { CreateSalaryProfileService } from "../create-salary-profile"

export function makeCreateSalaryProfileService() {
  const salaryProfilesRepository = new PrismaSalaryProfilesRepository()
  const createSalaryProfileService = new CreateSalaryProfileService(salaryProfilesRepository)

  return createSalaryProfileService
}