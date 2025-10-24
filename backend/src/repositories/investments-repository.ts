import { Prisma, Investment } from "@prisma/client";

export interface InvestmentsRepository {
  create(data: Prisma.InvestmentCreateInput): Promise<Investment>
  findManyByFinancialData(financialDataId: string): Promise<Investment[]>
  update(id: string, data: Prisma.InvestmentUpdateInput): Promise<Investment>
  delete(id: string): Promise<void>
  findById(id: string): Promise<Investment | null>
}