import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  DollarSign,
  Wallet,
  CreditCard,
  PiggyBank,
  AlertTriangle,
} from "lucide-react";
import { apiService } from "@/services/api";

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

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatPercentage = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return "0.0%";
  }
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

      // Ensure all values are numbers
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
        {/* Welcome Card Skeleton */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
              <div className="space-y-2">
                <div className="h-6 w-48 bg-muted animate-pulse rounded" />
                <div className="h-4 w-64 bg-muted animate-pulse rounded" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Grid Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-8 w-20 bg-muted animate-pulse rounded" />
                  <div className="h-6 w-16 bg-muted animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const stats = summary
    ? [
        {
          title: "Saldo Atual",
          value: `R$ ${formatCurrency(summary.currentBalance)}`,
          change: formatPercentage(summary.currentBalanceChange),
          icon: DollarSign,
          color:
            summary.currentBalance >= 0 ? "text-green-600" : "text-red-600",
        },
        {
          title: "Investimentos",
          value: `R$ ${formatCurrency(summary.totalInvestments)}`,
          change: formatPercentage(summary.investmentChange),
          icon: TrendingUp,
          color: "text-blue-600",
        },
        {
          title: "Gastos do Mês",
          value: `R$ ${formatCurrency(summary.monthlyExpenses)}`,
          change: formatPercentage(summary.expensesChange),
          icon: Wallet,
          color: "text-orange-600",
        },
        {
          title: "Cartão de Crédito",
          value: `R$ ${formatCurrency(summary.creditCardExpenses)}`,
          change: `${summary.totalCreditCardInstallments} parcelas`,
          icon: CreditCard,
          color: "text-purple-600",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback>
                {user?.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("") || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">
                Bem-vindo de volta, {user?.name || "Usuário"}!
              </h2>
              <p className="text-muted-foreground">
                Aqui está um resumo das suas finanças pessoais
              </p>
            </div>
            {summary && (
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  {summary.healthScore >= 70 ? (
                    <PiggyBank className="h-5 w-5 text-green-600" />
                  ) : summary.healthScore >= 40 ? (
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  )}
                  <span className="text-sm font-medium">
                    Saúde Financeira: {summary.healthScore.toFixed(0)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statistics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </h3>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold">{stat.value}</div>
                <Badge
                  variant={
                    stat.change.startsWith("+") ? "default" : "secondary"
                  }
                >
                  {stat.change}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Summary Card */}
      {summary && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Resumo do Mês</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Salário Líquido</p>
                <p className="font-semibold text-green-600">
                  R$ {formatCurrency(summary.salary)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Total de Gastos</p>
                <p className="font-semibold text-red-600">
                  R${" "}
                  {formatCurrency(
                    summary.monthlyExpenses + summary.creditCardExpenses,
                  )}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Sobrou</p>
                <p
                  className={`font-semibold ${summary.currentBalance >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  R$ {formatCurrency(summary.currentBalance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Statistics;
