import { useMemo } from "react";
import {
  getEffectiveAmount,
  getInvestmentTypeLabel,
  type Investment,
  type InvestmentHistory,
  type PeriodPreset,
  type Portfolio,
} from "../types";

export interface PeriodInvestmentData {
  startValue: number;
  endValue: number;
  hasData: boolean;
}

export interface PeriodMetrics {
  rendimento: number;
  rentabilidade: number;
  countWithData: number;
  totalCount: number;
  totalStart: number;
  totalEnd: number;
  perInvestment: Map<string, PeriodInvestmentData>;
}

export interface PortfolioGroup {
  key: string;
  name: string;
  type: string;
  rate: number | null;
  broker: string | null;
  investments: Investment[];
  totalAmount: number;
  totalGross: number;
  totalNet: number;
  periodStart: number;
  periodEnd: number;
  periodCount: number;
}

// Deriva do portfólio tudo que a aba Portfolio exibe: lista filtrada, resumo,
// métricas do período selecionado e agrupamento por nome + taxa.
export function usePortfolioMetrics(
  portfolio: Portfolio | undefined,
  historyData: InvestmentHistory[],
  portfolioFilter: string,
  periodPreset: PeriodPreset,
) {
  // Tipos disponíveis para filtro
  const availableInvestmentTypes = useMemo(() => {
    if (!portfolio) return [];
    const types = Array.from(
      new Set(portfolio.allInvestments.map((inv) => inv.investment_type)),
    );
    return types.map((type) => ({ value: type, label: getInvestmentTypeLabel(type) }));
  }, [portfolio]);

  // Investimentos filtrados (exclui encerrados: MATURED/SOLD/CANCELLED)
  const filteredInvestments = useMemo(() => {
    if (!portfolio) return [];
    const active = portfolio.allInvestments.filter((inv) => inv.status === "ACTIVE");
    if (portfolioFilter === "all") return active;
    return active.filter((inv) => inv.investment_type === portfolioFilter);
  }, [portfolio, portfolioFilter]);

  // Resumo calculado com base no filtro
  const filteredSummary = useMemo(() => {
    if (!portfolio) return null;
    if (portfolioFilter === "all") return portfolio.summary;

    let totalInvested = 0;
    let currentValue = 0;
    let netValue = 0;

    const nowTime = Date.now();
    filteredInvestments.forEach((inv) => {
      if (inv.status !== "ACTIVE") return;
      if (inv.maturity_date && new Date(inv.maturity_date).getTime() <= nowTime) return;
      const effectiveAmount = getEffectiveAmount(inv);
      totalInvested += effectiveAmount;
      currentValue += inv.gross_yield ?? effectiveAmount;
      netValue += inv.net_value ?? inv.gross_yield ?? effectiveAmount;
    });

    const totalReturn = currentValue - totalInvested;
    const returnPercentage = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

    return {
      totalInvested,
      currentValue,
      netValue,
      totalReturn,
      returnPercentage,
      lastUpdated: portfolio.summary.lastUpdated,
    };
  }, [portfolio, portfolioFilter, filteredInvestments]);

  // Métricas de rendimento no período selecionado
  const periodMetrics = useMemo<PeriodMetrics | null>(() => {
    if (filteredInvestments.length === 0) return null;

    const now = Date.now();
    let startTime: number;
    let periodLengthMs: number;
    switch (periodPreset) {
      case "30d": periodLengthMs = 30 * 24 * 60 * 60 * 1000; startTime = now - periodLengthMs; break;
      case "3m": periodLengthMs = 90 * 24 * 60 * 60 * 1000; startTime = now - periodLengthMs; break;
      case "6m": periodLengthMs = 180 * 24 * 60 * 60 * 1000; startTime = now - periodLengthMs; break;
      case "1y": periodLengthMs = 365 * 24 * 60 * 60 * 1000; startTime = now - periodLengthMs; break;
      case "all": periodLengthMs = Number.POSITIVE_INFINITY; startTime = 0; break;
    }

    const historyMap = new Map(historyData.map((h) => [h.id, h.history]));

    let totalStart = 0;
    let totalEnd = 0;
    let countWithData = 0;
    const perInvestment = new Map<string, PeriodInvestmentData>();

    filteredInvestments.forEach((inv) => {
      const history = historyMap.get(inv.id) || [];
      const effectiveAmount = getEffectiveAmount(inv);
      const endValue = inv.gross_yield ?? effectiveAmount;

      let startValue: number | null = null;

      if (periodPreset === "all") {
        // Desde o início → base é o principal investido
        startValue = effectiveAmount;
      } else {
        const before = history.filter((h) => new Date(h.date).getTime() <= startTime);
        if (before.length === 0) {
          // Nenhum snapshot antes do início do período
          if (history.length > 0) {
            // Investimento criado dentro do período → ganho desde a criação cabe no período
            startValue = effectiveAmount;
          }
          // Sem snapshots → não dá para calcular delta confiável
        } else {
          const latestBefore = before[before.length - 1];
          const latestBeforeTime = new Date(latestBefore.date).getTime();
          const ageOfBaseline = startTime - latestBeforeTime;
          // Considera o snapshot "fresco" só se ele estiver dentro de uma janela
          // de tamanho do período antes do início do período. Snapshots muito
          // antigos não representam o valor no início do período → marca como
          // sem dados para evitar reportar ganho histórico como ganho do período.
          if (ageOfBaseline <= periodLengthMs) {
            startValue = latestBefore.grossYield;
          }
        }
      }

      if (startValue !== null) {
        totalStart += startValue;
        totalEnd += endValue;
        countWithData++;
        perInvestment.set(inv.id, { startValue, endValue, hasData: true });
      } else {
        perInvestment.set(inv.id, { startValue: effectiveAmount, endValue, hasData: false });
      }
    });

    const rendimento = totalEnd - totalStart;
    const rentabilidade = totalStart > 0 ? (rendimento / totalStart) * 100 : 0;
    const totalCount = filteredInvestments.length;

    return { rendimento, rentabilidade, countWithData, totalCount, totalStart, totalEnd, perInvestment };
  }, [filteredInvestments, historyData, periodPreset]);

  // Agrupar investimentos do portfolio por nome + taxa
  const portfolioGroups = useMemo<PortfolioGroup[]>(() => {
    if (!portfolio) return [];
    const perInv = periodMetrics?.perInvestment;
    const groups = new Map<string, PortfolioGroup>();

    filteredInvestments.forEach((inv) => {
      const rate = inv.interest_rate ?? null;
      const key = `${inv.name}_${rate ?? "none"}`;
      const existing = groups.get(key);

      const effectiveAmount = getEffectiveAmount(inv);
      const period = perInv?.get(inv.id);
      const hasPeriod = period?.hasData ?? false;

      if (existing) {
        existing.investments.push(inv);
        existing.totalAmount += effectiveAmount;
        existing.totalGross += inv.gross_yield ?? effectiveAmount;
        existing.totalNet += inv.net_value ?? inv.gross_yield ?? effectiveAmount;
        if (hasPeriod && period) {
          existing.periodStart += period.startValue;
          existing.periodEnd += period.endValue;
          existing.periodCount++;
        }
      } else {
        groups.set(key, {
          key,
          name: inv.name,
          type: inv.investment_type,
          rate,
          broker: inv.broker ?? null,
          investments: [inv],
          totalAmount: effectiveAmount,
          totalGross: inv.gross_yield ?? effectiveAmount,
          totalNet: inv.net_value ?? inv.gross_yield ?? effectiveAmount,
          periodStart: hasPeriod && period ? period.startValue : 0,
          periodEnd: hasPeriod && period ? period.endValue : 0,
          periodCount: hasPeriod ? 1 : 0,
        });
      }
    });

    return Array.from(groups.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredInvestments, periodMetrics, portfolio]);

  return {
    availableInvestmentTypes,
    filteredInvestments,
    filteredSummary,
    periodMetrics,
    portfolioGroups,
  };
}
