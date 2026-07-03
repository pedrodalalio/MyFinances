import { prisma } from "@/lib/prisma";
import { RefreshTokensRepository } from "../refresh-tokens-repository";

export class PrismaRefreshTokensRepository implements RefreshTokensRepository {
  async create(data: { user_id: string; expires_at: Date }) {
    return prisma.refreshToken.create({ data });
  }

  async findById(id: string) {
    return prisma.refreshToken.findUnique({ where: { id } });
  }

  async revoke(id: string) {
    await prisma.refreshToken.updateMany({
      where: { id, revoked_at: null },
      data: { revoked_at: new Date() },
    });
  }

  async revokeAllByUser(userId: string) {
    await prisma.refreshToken.updateMany({
      where: { user_id: userId, revoked_at: null },
      data: { revoked_at: new Date() },
    });
  }
}
