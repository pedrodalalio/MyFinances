import { FastifyInstance } from "fastify";
import { register } from './register'
import { authenticate } from './authenticate'
import { profile } from "./profile";
import { verifyJWT } from "@/http/middlewares/verify-jwt";
import { refresh } from "./refresh";
import { logout } from "./logout";

export async function usersRoutes(app: FastifyInstance) {
  // Auth routes - matching frontend expectations
  app.post("/auth/register", register)
  app.post("/auth/login", authenticate)
  app.post("/auth/logout", logout)
  app.get("/auth/profile", { onRequest: [verifyJWT] }, profile)

  // Legacy routes (can be removed later)
  app.post("/users", register)
  app.post("/sessions", authenticate)
  app.patch("/token/refresh", refresh)
  app.get('/me', { onRequest: [verifyJWT] }, profile)
}