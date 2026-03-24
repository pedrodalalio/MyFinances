import { SalaryProfilesRepository } from "@/repositories/salary-profiles-repository"

interface DeleteSalaryProfileServiceRequest {
  id: string
  userId: string
}

export class DeleteSalaryProfileService {
  constructor(
    private salaryProfilesRepository: SalaryProfilesRepository
  ) {}

  async execute({ id, userId }: DeleteSalaryProfileServiceRequest) {
    const profile = await this.salaryProfilesRepository.findById(id)

    if (!profile || profile.user_id !== userId) {
      throw new Error("Perfil salarial não encontrado")
    }

    await this.salaryProfilesRepository.delete(id)
  }
}
