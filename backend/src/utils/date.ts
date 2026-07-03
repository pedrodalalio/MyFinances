// Datas "só dia" (sem hora relevante) são normalizadas para meio-dia UTC em
// todo o backend — controllers e parsers de importação. Meio-dia evita que a
// data mude de dia em qualquer fuso ao ser exibida.

export function parseDateOnly(str: string): Date {
  return new Date(`${str}T12:00:00Z`);
}

// month é 1-12 (como no calendário, não como no construtor de Date)
export function dateOnlyUTC(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}
