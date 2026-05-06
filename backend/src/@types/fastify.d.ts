import "fastify";

declare module "fastify" {
  interface FastifyReply {
    setRefreshTokenCookie(token: string): FastifyReply;
  }
}
