import { SalaryProfilesRepository } from "@/repositories/salary-profiles-repository"

interface GetCurrentSalaryServiceRequest {
  userId: string
}

interface GetCurrentSalaryServiceResponse {
  currentSalary: {
    id: string
    amount: number
    description: string | null
    start_date: Date
    end_date: Date | null
    is_active: boolean
    user_id: string
    created_at: Date
    updated_at: Date
  } | null
}

export class GetCurrentSalaryService {
  constructor(
    private salaryProfilesRepository: SalaryProfilesRepository
  ) {}

  async execute({
    userId
  }: GetCurrentSalaryServiceRequest): Promise<GetCurrentSalaryServiceResponse> {

    const currentSalary = await this.salaryProfilesRepository.findCurrentByUser(userId)

    return {
      currentSalary
    }
  }
}