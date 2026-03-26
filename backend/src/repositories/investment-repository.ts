import { Investment, InvestmentType, InvestmentStatus } from '@prisma/client'

export interface CreateInvestmentData {
  name: string
  description?: string
  amount: number
  netValue?: number
  grossYield?: number
  investmentType: InvestmentType
  category?: string
  date?: Date
  purchaseDate?: Date
  maturityDate?: Date
  interestRate?: number
  quantity?: number
  broker?: string
  status?: InvestmentStatus
  notes?: string
  userId: string
}

export interface UpdateInvestmentData {
  id: string
  name?: string
  description?: string
  amount?: number
  netValue?: number
  grossYield?: number
  investmentType?: InvestmentType
  category?: string
  date?: Date
  purchaseDate?: Date
  maturityDate?: Date
  interestRate?: number
  quantity?: number
  broker?: string
  status?: InvestmentStatus
  notes?: string
  userId: string
}

export interface InvestmentRepository {
  create(data: CreateInvestmentData): Promise<Investment>
  findByMonthAndUser(userId: string, month: string, year: number): Promise<Investment[]>
  findById(id: string): Promise<Investment | null>
  findAllPortfolioByUser(userId: string): Promise<Investment[]>
  update(data: UpdateInvestmentData): Promise<Investment>
  delete(id: string, userId: string): Promise<void>
}