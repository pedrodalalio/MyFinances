// Período mensal como armazenado no banco: month "01".."12" (string) + year.
// Centraliza o rollover de mês/ano para não espalhar parseInt/padStart.

export interface Period {
  month: string;
  year: number;
}

export function formatMonth(month: number): string {
  return month.toString().padStart(2, "0");
}

export function nextPeriod({ month, year }: Period): Period {
  const m = parseInt(month, 10);
  return m === 12
    ? { month: "01", year: year + 1 }
    : { month: formatMonth(m + 1), year };
}

export function previousPeriod({ month, year }: Period): Period {
  const m = parseInt(month, 10);
  return m === 1
    ? { month: "12", year: year - 1 }
    : { month: formatMonth(m - 1), year };
}
