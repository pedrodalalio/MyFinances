import { RefreshToken } from "@prisma/client";

export interface RefreshTokensRepository {
  create(data: { user_id: string; expires_at: Date }): Promise<RefreshToken>;
  findById(id: string): Promise<RefreshToken | null>;
  revoke(id: string): Promise<void>;
  revokeAllByUser(userId: string): Promise<void>;
}
