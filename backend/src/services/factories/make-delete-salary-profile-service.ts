import { PrismaSalaryProfilesRepository } from "@/repositories/prisma/prisma-salary-profiles-repository"
import { DeleteSalaryProfileService } from "../delete-salary-profile"

export function makeDeleteSalaryProfileService() {
  const salaryProfilesRepository = new PrismaSalaryProfilesRepository()
  return new DeleteSalaryProfileService(salaryProfilesRepository)
}
