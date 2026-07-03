import { PrismaFinancialDataRepository } from "@/repositories/prisma/prisma-financial-data-repository"
import { TransferBalanceToNextMonthService } from "../transfer-balance-to-next-month"
import { makeMonthSummaryService } from "./make-month-summary-service"

export function makeTransferBalanceService() {
  return new TransferBalanceToNextMonthService(
    new PrismaFinancialDataRepository(),
    makeMonthSummaryService(),
  )
}
