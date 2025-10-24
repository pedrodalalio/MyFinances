import { FinancialData } from "@prisma/client";
import { FinancialDataRepository } from "@/repositories/financial-data-repository";
import { ResourceNotFoundError } from "./errors/resource-not-found-error";

interface GetFinancialDataServiceRequest {
  userId: string;
  month: string;
  year: number;
}

interface GetFinancialDataServiceResponse {
  financialData: FinancialData;
}

export class GetFinancialDataService {
  constructor(private financialDataRepository: FinancialDataRepository) {}

  async execute({
    userId,
    month,
    year
  }: GetFinancialDataServiceRequest): Promise<GetFinancialDataServiceResponse> {

    const financialData = await this.financialDataRepository.findByUserAndPeriod(userId, month, year);

    if (!financialData) {
      throw new ResourceNotFoundError();
    }

    return { financialData };
  }
}