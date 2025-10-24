import { PrismaSalaryProfilesRepository } from "@/repositories/prisma/prisma-salary-profiles-repository"
import { ListSalaryProfilesService } from "../list-salary-profiles"

export function makeListSalaryProfilesService() {
  const salaryProfilesRepository = new PrismaSalaryProfilesRepository()
  const listSalaryProfilesService = new ListSalaryProfilesService(salaryProfilesRepository)

  return listSalaryProfilesService
}