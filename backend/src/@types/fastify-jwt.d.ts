import "@fastify/jwt"

declare module "@fastify/jwt" {
  export interface FastifyJWT{
    user: {
      sub: string
      role: "ADMIN" | "MEMBER"
      // Presente apenas no refresh token: id da linha em refresh_tokens
      jti?: string
    }
  }
}