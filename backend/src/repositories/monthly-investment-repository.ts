import { MonthlyInvestment, InvestmentType } from '@prisma/client'

export interface CreateMonthlyInvestmentData {
  name: string
  description?: string
  amount: number
  investmentType: InvestmentType
  category?: string
  month: string
  year: number
  date?: Date
  userId: string
}

export interface UpdateMonthlyInvestmentData {
  id: string
  name?: string
  description?: string
  amount?: number
  investmentType?: InvestmentType
  category?: string
  month?: string
  year?: number
  date?: Date
  userId: string
}

export interface MonthlyInvestmentRepository {
  create(data: CreateMonthlyInvestmentData): Promise<MonthlyInvestment>
  findByMonthAndUser(userId: string, month: string, year: number): Promise<MonthlyInvestment[]>
  findById(id: string): Promise<MonthlyInvestment | null>
  update(data: UpdateMonthlyInvestmentData): Promise<MonthlyInvestment>
  delete(id: string, userId: string): Promise<void>
}