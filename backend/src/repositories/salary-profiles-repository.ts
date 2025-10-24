import { Prisma, SalaryProfile } from "@prisma/client";

export interface SalaryProfilesRepository {
  create(data: Prisma.SalaryProfileCreateInput): Promise<SalaryProfile>
  findManyByUser(userId: string): Promise<SalaryProfile[]>
  findCurrentByUser(userId: string): Promise<SalaryProfile | null>
  findById(id: string): Promise<SalaryProfile | null>
  update(id: string, data: Prisma.SalaryProfileUpdateInput): Promise<SalaryProfile>
  delete(id: string): Promise<void>
  deactivateAll(userId: string): Promise<void>
}