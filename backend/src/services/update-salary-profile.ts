import { SalaryProfilesRepository } from "@/repositories/salary-profiles-repository"

interface UpdateSalaryProfileServiceRequest {
  id: string
  amount: number
  description?: string
  start_date: Date
  end_date?: Date
  userId: string
}

export class UpdateSalaryProfileService {
  constructor(
    private salaryProfilesRepository: SalaryProfilesRepository
  ) {}

  async execute({
    id,
    amount,
    description,
    start_date,
    end_date,
    userId
  }: UpdateSalaryProfileServiceRequest) {
    const profile = await this.salaryProfilesRepository.findById(id)

    if (!profile || profile.user_id !== userId) {
      throw new Error("Perfil salarial não encontrado")
    }

    const salaryProfile = await this.salaryProfilesRepository.update(id, {
      amount,
      description,
      start_date,
      end_date,
    })

    return { salaryProfile }
  }
}
