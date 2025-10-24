import { SalaryProfilesRepository } from "@/repositories/salary-profiles-repository"

interface ListSalaryProfilesServiceRequest {
  userId: string
}

interface ListSalaryProfilesServiceResponse {
  salaryProfiles: {
    id: string
    amount: number
    description: string | null
    start_date: Date
    end_date: Date | null
    is_active: boolean
    user_id: string
    created_at: Date
    updated_at: Date
  }[]
}

export class ListSalaryProfilesService {
  constructor(
    private salaryProfilesRepository: SalaryProfilesRepository
  ) {}

  async execute({
    userId
  }: ListSalaryProfilesServiceRequest): Promise<ListSalaryProfilesServiceResponse> {

    const salaryProfiles = await this.salaryProfilesRepository.findManyByUser(userId)

    return {
      salaryProfiles
    }
  }
}