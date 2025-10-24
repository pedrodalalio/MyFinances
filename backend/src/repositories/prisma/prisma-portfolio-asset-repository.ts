import { prisma } from '@/lib/prisma'
import { PortfolioAssetRepository, CreatePortfolioAssetRequest, UpdatePortfolioAssetRequest } from '../investment-portfolio-repository'

export class PrismaPortfolioAssetRepository implements PortfolioAssetRepository {
  async create(data: CreatePortfolioAssetRequest) {
    return prisma.portfolioAsset.create({
      data: {
        name: data.name,
        asset_type: data.assetType,
        initial_investment: data.initialInvestment,
        current_value: data.currentValue,
        quantity: data.quantity,
        purchase_date: data.purchaseDate,
        maturity_date: data.maturityDate,
        interest_rate: data.interestRate,
        notes: data.notes,
        broker: data.broker,
        portfolio_id: data.portfolioId,
      },
      include: {
        history: true
      }
    })
  }

  async findById(assetId: string) {
    return prisma.portfolioAsset.findUnique({
      where: {
        id: assetId,
      },
      include: {
        history: {
          orderBy: {
            date: 'desc'
          }
        },
        portfolio: true
      }
    })
  }

  async findByPortfolioId(portfolioId: string) {
    return prisma.portfolioAsset.findMany({
      where: {
        portfolio_id: portfolioId,
      },
      include: {
        history: {
          orderBy: {
            date: 'desc'
          },
          take: 1
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })
  }

  async update(data: UpdatePortfolioAssetRequest) {
    const updateData: any = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.assetType !== undefined) updateData.asset_type = data.assetType
    if (data.initialInvestment !== undefined) updateData.initial_investment = data.initialInvestment
    if (data.currentValue !== undefined) updateData.current_value = data.currentValue
    if (data.quantity !== undefined) updateData.quantity = data.quantity
    if (data.purchaseDate !== undefined) updateData.purchase_date = data.purchaseDate
    if (data.maturityDate !== undefined) updateData.maturity_date = data.maturityDate
    if (data.interestRate !== undefined) updateData.interest_rate = data.interestRate
    if (data.status !== undefined) updateData.status = data.status
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.broker !== undefined) updateData.broker = data.broker

    return prisma.portfolioAsset.update({
      where: {
        id: data.assetId,
      },
      data: updateData,
      include: {
        history: {
          orderBy: {
            date: 'desc'
          }
        }
      }
    })
  }

  async delete(assetId: string) {
    await prisma.portfolioAsset.delete({
      where: {
        id: assetId,
      },
    })
  }
}