import { z } from "zod"
import { FastifyRequest, FastifyReply } from "fastify"
import { UserAlreadyExistsError } from "@/services/errors/user-already-exists-error"
import { makeRegisterService } from "@/services/factories/make-register-service"
import { issueAuthTokens } from "@/http/utils/issue-auth-tokens"
import { PrismaRefreshTokensRepository } from "@/repositories/prisma/prisma-refresh-tokens-repository"

export async function register(request: FastifyRequest, reply: FastifyReply) {
  const registerBodySchema = z.object({
    name: z.string(),
    email: z.string().email(),
    password: z.string().min(6),
  })

  const { name, email, password } = registerBodySchema.parse(request.body)

  try {
    const registerService = makeRegisterService()

    const { user } = await registerService.execute({
      name,
      email,
      password
    })

    const { token, refreshToken } = await issueAuthTokens(
      reply,
      new PrismaRefreshTokensRepository(),
      user,
    )

    return reply
      .setRefreshTokenCookie(refreshToken)
      .status(201)
      .send({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar
        },
        token
      })
  } catch (error) {
    if(error instanceof UserAlreadyExistsError){
      return reply.status(409).send({ message: error.message})
    }

    throw error
  }
}