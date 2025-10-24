import { prisma } from '@/lib/prisma'
import { InvestmentPortfolioRepository } from '../investment-portfolio-repository'

export class PrismaInvestmentPortfolioRepository implements InvestmentPortfolioRepository {
  async findByUserId(userId: string) {
    return prisma.investmentPortfolio.findUnique({
      where: {
        user_id: userId,
      },
      include: {
        assets: {
          include: {
            history: {
              orderBy: {
                date: 'desc'
              },
              take: 5
            }
          },
          orderBy: {
            created_at: 'desc'
          }
        }
      }
    })
  }

  async createPortfolio(userId: string) {
    return prisma.investmentPortfolio.upsert({
      where: {
        user_id: userId,
      },
      update: {},
      create: {
        user_id: userId,
      },
      include: {
        assets: {
          include: {
            history: true
          }
        }
      }
    })
  }

  async updatePortfolioTotals(portfolioId: string, totalInvested: number, currentValue: number) {
    const totalReturn = currentValue - totalInvested
    const returnPercentage = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0

    return prisma.investmentPortfolio.update({
      where: {
        id: portfolioId,
      },
      data: {
        total_invested: totalInvested,
        current_value: currentValue,
        total_return: totalReturn,
        return_percentage: returnPercentage,
        last_updated: new Date(),
      },
    })
  }
}