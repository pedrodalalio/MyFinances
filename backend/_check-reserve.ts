import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
  const invs = await prisma.investment.findMany({
    where: { status: "ACTIVE", name: { contains: "Liquidez" } },
    select: {
      name: true,
      amount: true,
      is_reserve: true,
      purchase_date: true,
    },
  })
  for (const i of invs) {
    console.log(
      `${i.name} | R$ ${Number(i.amount).toFixed(2)} | is_reserve=${i.is_reserve} | data=${i.purchase_date?.toISOString().slice(0, 10)}`,
    )
  }
}
main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())
