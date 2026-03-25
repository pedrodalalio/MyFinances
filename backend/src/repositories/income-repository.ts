import { Income } from '@prisma/client'

export interface CreateIncomeData {
  name: string
  description?: string
  amount: number
  source?: string
  category?: string
  month: string
  year: number
  date: Date
  userId: string
}

export interface UpdateIncomeData {
  id: string
  userId: string
  name?: string
  description?: string
  amount?: number
  source?: string
  category?: string
  month?: string
  year?: number
  date?: Date
}

export interface IncomeRepository {
  create(data: CreateIncomeData): Promise<Income>
  findByMonthAndUser(userId: string, month: string, year: number): Promise<Income[]>
  findById(id: string): Promise<Income | null>
  update(data: UpdateIncomeData): Promise<Income>
  delete(id: string, userId: string): Promise<void>
}
