import { GetFinancialOverviewService } from "../get-financial-overview"
import { makeMonthSummaryService } from "./make-month-summary-service"

export function makeGetFinancialOverviewService() {
  return new GetFinancialOverviewService(makeMonthSummaryService())
}
