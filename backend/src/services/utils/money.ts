import { Prisma } from "@prisma/client";

// Toda a aritmética monetária do backend deve acontecer em Prisma.Decimal.
// Converter para number (toNumber) só na borda da resposta HTTP.

export const ZERO = new Prisma.Decimal(0);

export function toDecimal(
  value: Prisma.Decimal | number | string | null | undefined,
): Prisma.Decimal {
  if (value === null || value === undefined) return ZERO;
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

export function sumAmounts<T>(
  rows: T[],
  pick: (row: T) => Prisma.Decimal | number | string | null | undefined,
): Prisma.Decimal {
  return rows.reduce((sum, row) => sum.add(toDecimal(pick(row))), ZERO);
}

// ETF e FII são cadastrados com valor unitário: o desembolso é amount × quantity.
// Os demais tipos guardam o valor total aplicado em amount.
export function investmentOutflow(investment: {
  amount: Prisma.Decimal | number | string;
  quantity?: Prisma.Decimal | number | string | null;
  investment_type: string;
}): Prisma.Decimal {
  const amount = toDecimal(investment.amount);
  const isUnitPriced =
    investment.investment_type === "ETF" || investment.investment_type === "FII";

  if (!isUnitPriced) return amount;

  const quantity = investment.quantity ? toDecimal(investment.quantity) : new Prisma.Decimal(1);
  return amount.mul(quantity);
}
