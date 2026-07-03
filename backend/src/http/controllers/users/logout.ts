import { FastifyRequest, FastifyReply } from "fastify"
import { PrismaRefreshTokensRepository } from "@/repositories/prisma/prisma-refresh-tokens-repository"

export async function logout(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify({ onlyCookie: true })

    if (request.user.jti) {
      await new PrismaRefreshTokensRepository().revoke(request.user.jti)
    }
  } catch {
    // Cookie ausente ou inválido: nada a revogar, só limpar
  }

  return reply
    .clearCookie("refreshToken", { path: "/" })
    .status(204)
    .send()
}
