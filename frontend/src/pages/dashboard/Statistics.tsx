import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatCard } from "@/components/StatCard";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  CreditCard,
} from "lucide-react";
import { apiService } from "@/utils/api";
import { queryKeys } from "@/lib/query";
import QueryError from "@/components/QueryError";

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

  const {
    data: summary,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.dashboardSummary(),
    queryFn: async (): Promise<DashboardSummary> => {
      const data = await apiService.getDashboardSummary();

      return {
        ...data,
        currentBalance: Number(data.currentBalance) || 0,
        monthlyExpenses: Number(data.monthlyExpenses) || 0,
        creditCardExpenses: Number(data.creditCardExpenses) || 0,
        totalInvestments: Number(data.totalInvestments) || 0,
        salary: Number(data.salary) || 0,
        totalCreditCardInstallments:
          Number(data.totalCreditCardInstallments) || 0,
      };
    },
  });

  if (isPending) {
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

  if (isError) {
    return <QueryError onRetry={() => refetch()} />;
  }

  if (!summary) return null;

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_-10%,oklch(0.78_0.16_160/0.18),transparent_55%)]"
        />
        <div className="relative flex items-center gap-4">
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
    </div>
  );
};

export default Statistics;
