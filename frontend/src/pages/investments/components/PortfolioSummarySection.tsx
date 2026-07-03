import { BarChart3, Coins, DollarSign, PieChart, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { formatCurrency, PERIOD_LABEL, type PeriodPreset, type Portfolio } from "../types";
import type { PeriodMetrics } from "../hooks/usePortfolioMetrics";

interface PortfolioSummarySectionProps {
  summary: Portfolio["summary"];
  periodMetrics: PeriodMetrics | null;
  availableInvestmentTypes: Array<{ value: string; label: string }>;
  portfolioFilter: string;
  onFilterChange: (value: string) => void;
  periodPreset: PeriodPreset;
  onPeriodChange: (value: PeriodPreset) => void;
}

// Filtros (tipo + período) e cards de resumo do portfólio
export function PortfolioSummarySection({
  summary,
  periodMetrics,
  availableInvestmentTypes,
  portfolioFilter,
  onFilterChange,
  periodPreset,
  onPeriodChange,
}: PortfolioSummarySectionProps) {
  return (
    <>
      {/* Filtros: tipo + período */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={portfolioFilter} onValueChange={onFilterChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {availableInvestmentTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="inline-flex rounded-md border bg-background p-0.5">
          {([
            ["30d", "30d"],
            ["3m", "3m"],
            ["6m", "6m"],
            ["1y", "1a"],
            ["all", "Tudo"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onPeriodChange(value)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                periodPreset === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investido</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.totalInvested)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Bruto</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.currentValue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Líquido</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[color:var(--success)]">
              {formatCurrency(summary.netValue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Retorno Bruto · {PERIOD_LABEL[periodPreset]}
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {periodMetrics && periodMetrics.countWithData > 0 ? (
              <>
                <div
                  className={`text-2xl font-bold ${periodMetrics.rendimento >= 0 ? "text-[color:var(--success)]" : "text-destructive"}`}
                >
                  {periodMetrics.rendimento >= 0 ? "+" : ""}
                  {formatCurrency(periodMetrics.rendimento)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {periodMetrics.countWithData} de {periodMetrics.totalCount} com dados no período
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-muted-foreground">—</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Sem snapshots suficientes no período
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Rentabilidade · {PERIOD_LABEL[periodPreset]}
            </CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {periodMetrics && periodMetrics.countWithData > 0 ? (
              <>
                <div
                  className={`text-2xl font-bold ${periodMetrics.rentabilidade >= 0 ? "text-[color:var(--success)]" : "text-destructive"}`}
                >
                  {periodMetrics.rentabilidade >= 0 ? "+" : ""}
                  {periodMetrics.rentabilidade.toFixed(2)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Base: {formatCurrency(periodMetrics.totalStart)}
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-muted-foreground">—</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Sem snapshots suficientes no período
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
