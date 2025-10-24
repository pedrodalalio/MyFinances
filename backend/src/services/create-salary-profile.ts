import { SalaryProfilesRepository } from "@/repositories/salary-profiles-repository"

interface CreateSalaryProfileServiceRequest {
  amount: number
  description?: string
  start_date: Date
  end_date?: Date
  userId: string
}

interface CreateSalaryProfileServiceResponse {
  salaryProfile: {
    id: string
    amount: number
    description: string | null
    start_date: Date
    end_date: Date | null
    is_active: boolean
    user_id: string
    created_at: Date
    updated_at: Date
  }
}

export class CreateSalaryProfileService {
  constructor(
    private salaryProfilesRepository: SalaryProfilesRepository
  ) {}

  async execute({
    amount,
    description,
    start_date,
    end_date,
    userId
  }: CreateSalaryProfileServiceRequest): Promise<CreateSalaryProfileServiceResponse> {

    // Desativar perfis anteriores se este for ativo
    if (!end_date || end_date > new Date()) {
      await this.salaryProfilesRepository.deactivateAll(userId)
    }

    const salaryProfile = await this.salaryProfilesRepository.create({
      amount,
      description,
      start_date,
      end_date,
      user_id: userId
    })

    return {
      salaryProfile
    }
  }
}