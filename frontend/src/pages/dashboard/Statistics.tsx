import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatCard } from "@/components/StatCard";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  CreditCard,
  PiggyBank,
  AlertTriangle,
  Heart,
} from "lucide-react";
import { apiService } from "@/services/api";
import { cn } from "@/lib/utils";

import useAuth from "@hooks/useAuth";

interface DashboardSummary {
  currentBalance: number;
  currentBalanceChange: number | null;
  totalInvestments: number;
  investmentChange: number | null;
  monthlyExpenses: number;
  expensesChange: number | null;
  creditCardExpenses: number;
  totalCreditCardInstallments: number;
  salary: number;
  healthScore: number;
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const formatPercentage = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return "0.0%";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
};

const Statistics = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardSummary();
  }, []);

  const loadDashboardSummary = async () => {
    try {
      setLoading(true);
      const data = await apiService.getDashboardSummary();

      setSummary({
        ...data,
        currentBalance: Number(data.currentBalance) || 0,
        monthlyExpenses: Number(data.monthlyExpenses) || 0,
        creditCardExpenses: Number(data.creditCardExpenses) || 0,
        totalInvestments: Number(data.totalInvestments) || 0,
        salary: Number(data.salary) || 0,
        healthScore: Number(data.healthScore) || 0,
        totalCreditCardInstallments:
          Number(data.totalCreditCardInstallments) || 0,
      });
    } catch (error) {
      console.error("Erro ao carregar resumo do dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-10 w-32 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const healthColor =
    summary.healthScore >= 70
      ? "success"
      : summary.healthScore >= 40
        ? "warning"
        : "destructive";

  const healthLabel =
    summary.healthScore >= 70
      ? "Excelente"
      : summary.healthScore >= 40
        ? "Atenção"
        : "Crítico";

  return (
    <div className="space-y-6">
      {/* Welcome / health banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_-10%,oklch(0.78_0.16_160/0.18),transparent_55%)]"
        />
        <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="size-12 ring-2 ring-primary/20">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="bg-primary/15 font-display font-semibold text-primary">
                {user?.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-display text-xl font-bold tracking-tight">
                Bem-vindo de volta
              </h2>
              <p className="text-sm text-muted-foreground">
                Resumo das suas finanças pessoais — atualizado agora.
              </p>
            </div>
          </div>
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl border px-4 py-2.5",
              healthColor === "success" &&
                "border-[color:var(--success)]/30 bg-[color:var(--success)]/5",
              healthColor === "warning" &&
                "border-[color:var(--warning)]/30 bg-[color:var(--warning)]/5",
              healthColor === "destructive" &&
                "border-destructive/30 bg-destructive/5",
            )}
          >
            <span
              className={cn(
                "grid size-9 place-items-center rounded-lg",
                healthColor === "success" &&
                  "bg-[color:var(--success)]/15 text-[color:var(--success)]",
                healthColor === "warning" &&
                  "bg-[color:var(--warning)]/15 text-[color:var(--warning)]",
                healthColor === "destructive" && "bg-destructive/15 text-destructive",
              )}
            >
              {summary.healthScore >= 70 ? (
                <PiggyBank className="size-5" />
              ) : summary.healthScore >= 40 ? (
                <AlertTriangle className="size-5" />
              ) : (
                <Heart className="size-5" />
              )}
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Saúde financeira
              </p>
              <p className="font-display text-lg font-bold tabular">
                {summary.healthScore.toFixed(0)}
                <span className="ml-1 text-sm font-medium text-muted-foreground">
                  / 100
                </span>
                <span
                  className={cn(
                    "ml-2 text-xs font-semibold uppercase tracking-wider",
                    healthColor === "success" && "text-[color:var(--success)]",
                    healthColor === "warning" && "text-[color:var(--warning)]",
                    healthColor === "destructive" && "text-destructive",
                  )}
                >
                  {healthLabel}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Saldo atual"
          value={`R$ ${formatCurrency(summary.currentBalance)}`}
          icon={DollarSign}
          emphasis={summary.currentBalance >= 0 ? "success" : "destructive"}
          hint={
            <span className="flex items-center gap-1">
              {(summary.currentBalanceChange ?? 0) >= 0 ? (
                <TrendingUp className="size-3 text-[color:var(--success)]" />
              ) : (
                <TrendingDown className="size-3 text-destructive" />
              )}
              <span className="tabular">
                {formatPercentage(summary.currentBalanceChange)} vs. mês anterior
              </span>
            </span>
          }
        />
        <StatCard
          label="Investimentos"
          value={`R$ ${formatCurrency(summary.totalInvestments)}`}
          icon={TrendingUp}
          emphasis="primary"
          hint={
            <span className="tabular">
              {formatPercentage(summary.investmentChange)} de rendimento
            </span>
          }
        />
        <StatCard
          label="Gastos do mês"
          value={`R$ ${formatCurrency(summary.monthlyExpenses)}`}
          icon={Wallet}
          emphasis="warning"
          hint={
            <span className="tabular">
              {formatPercentage(summary.expensesChange)} vs. mês anterior
            </span>
          }
        />
        <StatCard
          label="Cartão de crédito"
          value={`R$ ${formatCurrency(summary.creditCardExpenses)}`}
          icon={CreditCard}
          hint={
            <span className="tabular">
              {summary.totalCreditCardInstallments} parcelas em aberto
            </span>
          }
        />
      </div>

      {/* Quick Summary Card */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-baseline justify-between">
            <h3 className="font-display text-lg font-semibold tracking-tight">
              Resumo do mês
            </h3>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Fluxo
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-xs text-muted-foreground">Salário líquido</p>
              <p className="mt-1 font-display text-xl font-bold tabular text-[color:var(--success)]">
                R$ {formatCurrency(summary.salary)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-xs text-muted-foreground">Total de gastos</p>
              <p className="mt-1 font-display text-xl font-bold tabular text-destructive">
                R${" "}
                {formatCurrency(
                  summary.monthlyExpenses + summary.creditCardExpenses,
                )}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-xs text-muted-foreground">Sobrou</p>
              <p
                className={cn(
                  "mt-1 font-display text-xl font-bold tabular",
                  summary.currentBalance >= 0
                    ? "text-[color:var(--success)]"
                    : "text-destructive",
                )}
              >
                R$ {formatCurrency(summary.currentBalance)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Statistics;
