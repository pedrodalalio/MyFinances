import { FastifyReply } from "fastify";
import { RefreshTokensRepository } from "@/repositories/refresh-tokens-repository";

export const REFRESH_TOKEN_EXPIRATION_DAYS = 7;

interface TokenUser {
  id: string;
  role: "ADMIN" | "MEMBER";
}

// Emite o par access/refresh token. O refresh token carrega o `jti` da linha
// criada em refresh_tokens — sem linha válida no banco, o token é recusado
// (permite revogação e rotação de uso único).
export async function issueAuthTokens(
  reply: FastifyReply,
  refreshTokensRepository: RefreshTokensRepository,
  user: TokenUser,
) {
  const token = await reply.jwtSign(
    { role: user.role },
    { sign: { sub: user.id } },
  );

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRATION_DAYS);

  const stored = await refreshTokensRepository.create({
    user_id: user.id,
    expires_at: expiresAt,
  });

  const refreshToken = await reply.jwtSign(
    { role: user.role, jti: stored.id },
    { sign: { sub: user.id, expiresIn: `${REFRESH_TOKEN_EXPIRATION_DAYS}d` } },
  );

  return { token, refreshToken };
}
