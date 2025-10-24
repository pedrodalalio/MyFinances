import { PrismaSalaryProfilesRepository } from "@/repositories/prisma/prisma-salary-profiles-repository"
import { GetCurrentSalaryService } from "../get-current-salary"

export function makeGetCurrentSalaryService() {
  const salaryProfilesRepository = new PrismaSalaryProfilesRepository()
  const getCurrentSalaryService = new GetCurrentSalaryService(salaryProfilesRepository)

  return getCurrentSalaryService
}