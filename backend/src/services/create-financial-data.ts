import { FinancialData } from "@prisma/client";
import { FinancialDataRepository } from "@/repositories/financial-data-repository";

interface CreateFinancialDataServiceRequest {
  userId: string;
  month: string;
  year: number;
  mainIncome?: number;
  checkingAccount?: number;
}

interface CreateFinancialDataServiceResponse {
  financialData: FinancialData;
}

export class CreateFinancialDataService {
  constructor(private financialDataRepository: FinancialDataRepository) {}

  async execute({
    userId,
    month,
    year,
    mainIncome = 0,
    checkingAccount = 0
  }: CreateFinancialDataServiceRequest): Promise<CreateFinancialDataServiceResponse> {

    // Check if data already exists for this period
    const existingData = await this.financialDataRepository.findByUserAndPeriod(userId, month, year);

    if (existingData) {
      return { financialData: existingData };
    }

    const totalInAccount = mainIncome + checkingAccount;

    const financialData = await this.financialDataRepository.create({
      month,
      year,
      main_income: mainIncome,
      checking_account: checkingAccount,
      total_in_account: totalInAccount,
      total_income: totalInAccount,
      user: {
        connect: { id: userId }
      }
    });

    return { financialData };
  }
}