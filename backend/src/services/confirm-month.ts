import { FinancialDataRepository } from "@/repositories/financial-data-repository";
import { ResourceNotFoundError } from "./errors/resource-not-found-error";
import { computeMonthTotals, MonthSummaryService } from "./month-summary";
import { nextPeriod } from "./utils/period";

interface ConfirmMonthServiceRequest {
  userId: string;
  month: string;
  year: number;
}

export class ConfirmMonthService {
  constructor(
    private financialDataRepository: FinancialDataRepository,
    private monthSummaryService: MonthSummaryService,
  ) {}

  async execute({
    userId,
    month,
    year,
  }: ConfirmMonthServiceRequest): Promise<void> {
    const records = await this.monthSummaryService.fetch({ userId, month, year });

    if (!records.financialData) {
      throw new ResourceNotFoundError();
    }

    const totals = computeMonthTotals(records, { month, year });
    const next = nextPeriod({ month, year });

    // Confirmar o mês atual e carregar o saldo para o próximo numa única
    // transação, para nunca confirmar sem transferir (ou vice-versa).
    await this.financialDataRepository.confirmAndCarryOver(
      records.financialData.id,
      {
        userId,
        month: next.month,
        year: next.year,
        previousBalance: totals.finalBalance,
      },
    );
  }
}
