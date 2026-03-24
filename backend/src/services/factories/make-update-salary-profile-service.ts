import { PrismaSalaryProfilesRepository } from "@/repositories/prisma/prisma-salary-profiles-repository"
import { UpdateSalaryProfileService } from "../update-salary-profile"

export function makeUpdateSalaryProfileService() {
  const salaryProfilesRepository = new PrismaSalaryProfilesRepository()
  return new UpdateSalaryProfileService(salaryProfilesRepository)
}
