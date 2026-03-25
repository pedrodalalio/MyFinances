import fastify from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import fastifyMultipart from "@fastify/multipart";
import { usersRoutes } from "./http/controllers/users/routes";
import { financialDataRoutes } from "./http/controllers/financial-data/routes";
import { transactionsRoutes } from "./http/controllers/transactions/routes";
import { creditCardRoutes } from "./http/controllers/credit-card/routes";
import { salaryRoutes } from "./http/controllers/salary/routes";
import { expensesRoutes } from "./http/controllers/expenses/routes";
import { incomesRoutes } from "./http/controllers/incomes/routes";
import { monthlyInvestmentsRoutes } from "./http/controllers/monthly-investments/routes";
import { taxesRoutes } from "./http/controllers/taxes/routes";
import { importsRoutes } from "./http/controllers/imports/routes";
import { dashboardRoutes } from "./http/controllers/dashboard/routes";
import { ZodError } from "zod";
import { env } from "./env";
import fastifyJwt from "@fastify/jwt";

export const app = fastify();

app.register(fastifyCors, {
  origin:
    env.NODE_ENV === "production"
      ? ["https://your-frontend-domain.com"] // Adicionar domínio de produção aqui
      : ["http://localhost:5173", "http://localhost:3000"], // Vite e outros servidores de dev
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
});

app.register(fastifyJwt, {
  secret: env.JWT_SECRET,
  cookie: {
    cookieName: "refreshToken",
    signed: false,
  },
  sign: {
    expiresIn: "1h",
  },
});

app.register(fastifyCookie);
app.register(fastifyMultipart, {
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

app.register(usersRoutes);
app.register(financialDataRoutes);
app.register(transactionsRoutes);
app.register(creditCardRoutes);
app.register(salaryRoutes);
app.register(expensesRoutes);
app.register(incomesRoutes);
app.register(monthlyInvestmentsRoutes);
app.register(taxesRoutes);
app.register(importsRoutes);
app.register(dashboardRoutes);

app.setErrorHandler((error, _, reply) => {
  if (error instanceof ZodError) {
    return reply
      .status(400)
      .send({ message: "Validation error", issues: error.format() });
  }

  if (env.NODE_ENV !== "production") {
    console.error(error);
  } else {
    // TODO: Here we should log to an external tool like DataDog/NewRelic/Sentry
  }

  return reply.status(500).send({ message: "Internal server error." });
});
