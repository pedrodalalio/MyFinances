import { FastifyRequest, FastifyReply } from "fastify"
import { issueAuthTokens } from "@/http/utils/issue-auth-tokens"
import { PrismaRefreshTokensRepository } from "@/repositories/prisma/prisma-refresh-tokens-repository"

export async function refresh(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify({ onlyCookie: true })
  } catch {
    return reply.status(401).send({ message: "Invalid refresh token." })
  }

  const refreshTokensRepository = new PrismaRefreshTokensRepository()
  const { sub, role, jti } = request.user

  const stored = jti ? await refreshTokensRepository.findById(jti) : null
  const isValid =
    stored && !stored.revoked_at && stored.expires_at > new Date()

  if (!jti || !isValid) {
    // Token revogado, expirado ou emitido antes da rotação existir
    return reply
      .clearCookie("refreshToken", { path: "/" })
      .status(401)
      .send({ message: "Invalid refresh token." })
  }

  // Rotação: refresh token é de uso único
  await refreshTokensRepository.revoke(jti)

  const { token, refreshToken } = await issueAuthTokens(
    reply,
    refreshTokensRepository,
    { id: sub, role },
  )

  return reply
    .setRefreshTokenCookie(refreshToken)
    .status(200)
    .send({ token })
}
