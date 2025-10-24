import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { SalaryProfilesRepository } from "../salary-profiles-repository"

export class PrismaSalaryProfilesRepository implements SalaryProfilesRepository {
  async create(data: Prisma.SalaryProfileCreateInput) {
    const salaryProfile = await prisma.salaryProfile.create({
      data
    })

    return salaryProfile
  }

  async findManyByUser(userId: string) {
    const salaryProfiles = await prisma.salaryProfile.findMany({
      where: {
        user_id: userId
      },
      orderBy: {
        start_date: 'desc'
      }
    })

    return salaryProfiles
  }

  async findCurrentByUser(userId: string) {
    const now = new Date()

    const currentProfile = await prisma.salaryProfile.findFirst({
      where: {
        user_id: userId,
        is_active: true,
        start_date: {
          lte: now
        },
        OR: [
          { end_date: null },
          { end_date: { gte: now } }
        ]
      },
      orderBy: {
        start_date: 'desc'
      }
    })

    return currentProfile
  }

  async findById(id: string) {
    const salaryProfile = await prisma.salaryProfile.findUnique({
      where: { id }
    })

    return salaryProfile
  }

  async update(id: string, data: Prisma.SalaryProfileUpdateInput) {
    const salaryProfile = await prisma.salaryProfile.update({
      where: { id },
      data
    })

    return salaryProfile
  }

  async delete(id: string) {
    await prisma.salaryProfile.delete({
      where: { id }
    })
  }

  async deactivateAll(userId: string) {
    await prisma.salaryProfile.updateMany({
      where: {
        user_id: userId,
        is_active: true
      },
      data: {
        is_active: false,
        end_date: new Date()
      }
    })
  }
}