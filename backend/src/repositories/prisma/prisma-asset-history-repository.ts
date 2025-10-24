import { prisma } from '@/lib/prisma'
import { AssetHistoryRepository, CreateAssetHistoryRequest } from '../investment-portfolio-repository'

export class PrismaAssetHistoryRepository implements AssetHistoryRepository {
  async create(data: CreateAssetHistoryRequest) {
    return prisma.assetHistory.create({
      data: {
        asset_id: data.assetId,
        value: data.value,
        date: data.date,
        notes: data.notes,
      },
    })
  }

  async findByAssetId(assetId: string) {
    return prisma.assetHistory.findMany({
      where: {
        asset_id: assetId,
      },
      orderBy: {
        date: 'desc'
      }
    })
  }
}