import { useState } from "react";
import { Plus, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InvestmentCharts } from "@/components/InvestmentCharts";
import QueryError from "@/components/QueryError";

import { PERIOD_LABEL, type Investment, type MaturedInvestment, type PeriodPreset } from "../types";
import {
  useInvestmentHistoryQuery,
  useMaturedInvestmentsQuery,
  usePortfolioQuery,
} from "../hooks/useInvestments";
import { usePortfolioMetrics } from "../hooks/usePortfolioMetrics";
import { CdiComparisonChart } from "./CdiComparisonChart";
import { MaturedInvestmentsCard } from "./MaturedInvestmentsCard";
import { PassiveIncomeCard } from "./PassiveIncomeCard";
import { PortfolioSummarySection } from "./PortfolioSummarySection";
import { PortfolioGroupsCard } from "./PortfolioGroupsCard";
import { RedeemDialog } from "./RedeemDialog";

interface PortfolioTabProps {
  onCreateInvestment: () => void;
  onEditInvestment: (investment: Investment) => void;
  // Reinvestimento de um vencido: abre o cadastro pré-preenchido no pai
  onReinvest: (source: MaturedInvestment, amount: number, purchaseDateISO: string) => void;
}

export function PortfolioTab({
  onCreateInvestment,
  onEditInvestment,
  onReinvest,
}: PortfolioTabProps) {
  const [portfolioFilter, setPortfolioFilter] = useState<string>("all");
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("30d");
  const [redeemingInvestment, setRedeemingInvestment] = useState<MaturedInvestment | null>(null);
  const [redeemMode, setRedeemMode] = useState<"redeem" | "reinvest">("redeem");

  const portfolioQuery = usePortfolioQuery();
  const maturedQuery = useMaturedInvestmentsQuery();
  const historyQuery = useInvestmentHistoryQuery();

  const portfolio = portfolioQuery.data;
  const maturedInvestments = maturedQuery.data ?? [];
  const historyData = historyQuery.data ?? [];

  const {
    availableInvestmentTypes,
    filteredInvestments,
    filteredSummary,
    periodMetrics,
    portfolioGroups,
  } = usePortfolioMetrics(portfolio, historyData, portfolioFilter, periodPreset);

  const openRedeemDialog = (inv: MaturedInvestment, mode: "redeem" | "reinvest" = "redeem") => {
    setRedeemingInvestment(inv);
    setRedeemMode(mode);
  };

  const closeRedeemDialog = () => {
    setRedeemingInvestment(null);
    setRedeemMode("redeem");
  };

  if (portfolioQuery.isError) {
    return <QueryError onRetry={() => portfolioQuery.refetch()} />;
  }

  return (
    <>
      <MaturedInvestmentsCard
        investments={maturedInvestments}
        onRedeem={(inv) => openRedeemDialog(inv)}
        onReinvest={(inv) => openRedeemDialog(inv, "reinvest")}
      />

      {portfolio && filteredSummary && (
        <>
          <PassiveIncomeCard investments={portfolio.allInvestments} />

          <PortfolioSummarySection
            summary={filteredSummary}
            periodMetrics={periodMetrics}
            availableInvestmentTypes={availableInvestmentTypes}
            portfolioFilter={portfolioFilter}
            onFilterChange={setPortfolioFilter}
            periodPreset={periodPreset}
            onPeriodChange={setPeriodPreset}
          />

          {/* Gráficos e Análises */}
          {filteredInvestments.length > 0 && (
            <>
              <CdiComparisonChart filter={portfolioFilter} />
              <InvestmentCharts
                investments={filteredInvestments}
                selectedFilter={portfolioFilter}
                periodLabel={PERIOD_LABEL[periodPreset]}
                periodData={periodMetrics?.perInvestment ?? new Map()}
              />
            </>
          )}

          {/* Listagem agrupada */}
          <PortfolioGroupsCard
            groups={portfolioGroups}
            periodPreset={periodPreset}
            onCreate={onCreateInvestment}
            onEdit={onEditInvestment}
          />
        </>
      )}

      {(!portfolio || portfolio.allInvestments.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Nenhum investimento no portfolio
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              Adicione investimentos com acompanhamento de portfolio para ver
              análises detalhadas.
            </p>
            <Button onClick={onCreateInvestment}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Primeiro Investimento
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Resgate de Investimento Vencido */}
      <RedeemDialog
        investment={redeemingInvestment}
        mode={redeemMode}
        onClose={closeRedeemDialog}
        onReinvest={onReinvest}
      />
    </>
  );
}
