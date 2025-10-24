import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Criar usuário de teste
  const user = await prisma.user.upsert({
    where: { email: "teste@teste.com" },
    update: {},
    create: {
      name: "Usuário Teste",
      email: "teste@teste.com",
      password_hash: await hash("123456", 6),
      role: "MEMBER",
    },
  });

  // Criar perfil de salário
  await prisma.salaryProfile.upsert({
    where: { id: "test-salary-id" },
    update: {},
    create: {
      id: "test-salary-id",
      amount: 5000,
      description: "Salário Principal",
      start_date: new Date("2024-01-01"),
      is_active: true,
      user_id: user.id,
    },
  });

  // Criar dados financeiros para outubro de 2025
  await prisma.financialData.upsert({
    where: {
      user_id_month_year: {
        user_id: user.id,
        month: "10",
        year: 2025,
      },
    },
    update: {},
    create: {
      month: "10",
      year: 2025,
      user_id: user.id,
      main_income: 5000,
      checking_account: 1000,
      total_in_account: 6000,
      expense_subtotal: 1500,
      investment_subtotal: 500,
      credit_card_subtotal: 800,
      tax_subtotal: 200,
      total_income: 5000,
      total_expenses: 3000,
      final_balance: 2000,
      expected_total_money: 5000,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
