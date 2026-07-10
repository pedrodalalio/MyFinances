import { useQuery } from "@tanstack/react-query";
import { Building2, Landmark, PiggyBank } from "lucide-react";

import { api } from "@/utils/api";
import { queryKeys } from "@/lib/query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { formatCurrency, type Investment } from "../types";
import type { FiiIncomeData } from "@/components/FiiIncomePanel";

// Tipos de renda fixa cujo rendimento acumula no saldo com base na taxa.
// FII entra pelo endpoint de proventos (dinheiro que cai na conta), não aqui.
const FIXED_INCOME_TYPES = new Set([
  "CDB",
  "LCI_LCA",
  "DEBENTURES",
  "TREASURY",
  "SAVINGS",
]);

// A taxa cadastrada (interest_rate) é ambígua: um CDB "119% do CDI" guarda 119,
// um Tesouro prefixado "13% a.a." guarda 13. Nenhum CDB paga 119% a.a. e nenhum
// produto paga 50% do CDI, então este corte separa bem os dois significados.
const CDI_PERCENT_THRESHOLD = 50;

// Desconto de IR para chutar pra baixo e trazer um número líquido realista.
// 15% é a faixa mais branda (aplicações > 2 anos) — "pessimista, mas não tanto".
// Proventos de FII são isentos, então não levam esse desconto.
const FIXED_INCOME_IR = 0.15;

function isCountable(inv: Investment): boolean {
  if (inv.status !== "ACTIVE") return false;
  if (inv.maturity_date && new Date(inv.maturity_date).getTime() <= Date.now()) {
    return false;
  }
  return true;
}

interface FixedIncomeEstimate {
  monthly: number;
  daily: number;
  base: number;
  count: number;
  // Há ativo atrelado ao CDI mas ainda não temos a taxa do CDI para converter.
  needsCdi: boolean;
}

// Estima o rendimento líquido da renda fixa. Taxas altas são tratadas como
// "% do CDI" (precisam de cdiAnnual); taxas baixas como "% a.a." absoluto.
function estimateFixedIncome(
  investments: Investment[],
  cdiAnnual: number | null,
): FixedIncomeEstimate {
  let monthly = 0;
  let daily = 0;
  let base = 0;
  let count = 0;
  let needsCdi = false;

  for (const inv of investments) {
    if (!isCountable(inv)) continue;
    if (!FIXED_INCOME_TYPES.has(inv.investment_type)) continue;

    const rate = inv.interest_rate;
    if (!rate || rate <= 0) continue;

    let annual: number;
    if (rate >= CDI_PERCENT_THRESHOLD) {
      // "% do CDI": precisa do CDI atual para virar reais.
      if (cdiAnnual === null) {
        needsCdi = true;
        continue;
      }
      annual = (cdiAnnual / 100) * (rate / 100);
    } else {
      // "% a.a." absoluto (ex.: Tesouro prefixado).
      annual = rate / 100;
    }

    // Renda fixa não é precificada por cota: valor efetivo = valor bruto atual.
    const value = inv.gross_yield ?? inv.amount;
    if (!value || value <= 0) continue;

    const netFactor = 1 - FIXED_INCOME_IR;
    monthly += value * (Math.pow(1 + annual, 1 / 12) - 1) * netFactor;
    daily += value * (Math.pow(1 + annual, 1 / 365) - 1) * netFactor;
    base += value;
    count += 1;
  }

  return { monthly, daily, base, count, needsCdi };
}

interface SubIncomeProps {
  icon: React.ReactNode;
  label: string;
  monthly: number | null;
  note: string;
}

function SubIncome({ icon, label, monthly, note }: SubIncomeProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-background/50 p-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-lg font-semibold">
          {monthly === null ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <>
              {formatCurrency(monthly)}
              <span className="text-sm font-normal text-muted-foreground">
                {" "}
                /mês
              </span>
            </>
          )}
        </p>
        <p className="text-xs text-muted-foreground">{note}</p>
      </div>
    </div>
  );
}

interface PassiveIncomeCardProps {
  investments: Investment[];
}

// Card de visão geral: quanto o portfólio rende por mês/dia, somando o
// rendimento líquido da renda fixa (que acumula no saldo) com os proventos
// de FII (que caem na conta). Números conservadores, de propósito.
export function PassiveIncomeCard({ investments }: PassiveIncomeCardProps) {
  const cdiQuery = useQuery<{ annualRate: number; asOf: string }>({
    queryKey: queryKeys.cdiRate,
    queryFn: async () => (await api.get("/investments/cdi-rate")).data,
    staleTime: 6 * 60 * 60 * 1000, // CDI muda no máximo 1x/dia
  });

  const fiiQuery = useQuery<FiiIncomeData>({
    queryKey: queryKeys.fiiIncome,
    queryFn: async () => (await api.get("/investments/fii-income")).data,
  });

  const cdiAnnual = cdiQuery.data?.annualRate ?? null;
  const fixed = estimateFixedIncome(investments, cdiAnnual);

  const fiiMonthly = fiiQuery.data?.summary.monthly_forecast ?? 0;
  const fiiDaily = fiiMonthly / 30;
  const fiiReady = !!fiiQuery.data;

  const hasFixed = fixed.count > 0 || fixed.needsCdi;

  // Não renderiza se não há nada com que estimar renda recorrente.
  if (!hasFixed && (!fiiReady || fiiMonthly <= 0)) return null;

  const totalMonthly = fixed.monthly + (fiiReady ? fiiMonthly : 0);
  const totalDaily = fixed.daily + (fiiReady ? fiiDaily : 0);
  const partial = fixed.needsCdi || !fiiReady;

  let fixedNote: string;
  let fixedValue: number | null;
  if (fixed.count > 0) {
    fixedValue = fixed.monthly;
    fixedNote = `líquido de IR · ${fixed.count} ativo${fixed.count > 1 ? "s" : ""}`;
  } else if (fixed.needsCdi) {
    fixedValue = null;
    fixedNote = cdiQuery.isError
      ? "CDI indisponível no momento"
      : "buscando taxa do CDI…";
  } else {
    fixedValue = null;
    fixedNote = "nenhum ativo com taxa cadastrada";
  }

  let fiiNote: string;
  if (fiiQuery.isPending) fiiNote = "calculando proventos…";
  else if (fiiQuery.isError) fiiNote = "proventos indisponíveis no momento";
  else if (fiiMonthly <= 0) fiiNote = "nenhum FII com proventos";
  else fiiNote = "isento · média dos últimos 12 meses";

  return (
    <Card className="border-primary/30 bg-primary/[0.03]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Renda passiva estimada
        </CardTitle>
        <PiggyBank className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-3xl font-bold text-[color:var(--success)]">
            ~{formatCurrency(totalMonthly)}
            <span className="text-lg font-normal text-muted-foreground">
              {" "}
              /mês
            </span>
          </span>
          <span className="text-muted-foreground">
            · ~{formatCurrency(totalDaily)}/dia
          </span>
          {partial && (
            <span className="text-xs text-muted-foreground">(parcial)</span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SubIncome
            icon={<Landmark className="h-4 w-4" />}
            label="Renda fixa"
            monthly={fixedValue}
            note={`rende no saldo · ${fixedNote}`}
          />
          <SubIncome
            icon={<Building2 className="h-4 w-4" />}
            label="Proventos FII"
            monthly={fiiReady && fiiMonthly > 0 ? fiiMonthly : null}
            note={`cai na conta · ${fiiNote}`}
          />
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Estimativa conservadora. A renda fixa usa a taxa cadastrada de cada
          ativo (≥ 50 é tratado como % do CDI, com CDI de{" "}
          {cdiAnnual !== null ? `${cdiAnnual.toFixed(1)}% a.a.` : "…"}), já
          descontando ~15% de IR; os FIIs usam a média de proventos dos últimos
          12 meses. O valor real pode variar — a ideia é não superestimar.
        </p>
      </CardContent>
    </Card>
  );
}
