import { QueryClient } from "@tanstack/react-query";

// Client único do TanStack Query. Todo fetch de dados do app passa por
// useQuery/useMutation; sincronização entre telas é feita invalidando keys
// (nada de window.dispatchEvent).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Convenção de keys: [escopo, ...params]. Sempre usar estas fábricas para que
// as invalidações por escopo (prefixo) funcionem.
export const queryKeys = {
  financialOverview: (month: string, year: number | string) =>
    ["financial-overview", String(month), String(year)] as const,
  financialData: (month: string, year: number | string) =>
    ["financial-data", String(month), String(year)] as const,
  dashboardSummary: (month?: string, year?: string) =>
    ["dashboard-summary", month ?? "current", year ?? "current"] as const,
  monthlyFlow: (year: string) => ["monthly-flow", year] as const,
  expensesByCategory: (month: string, year: string) =>
    ["expenses-by-category", month, year] as const,
  expenses: (month: string, year: number | string) =>
    ["expenses", String(month), String(year)] as const,
  incomes: (month: string, year: number | string) =>
    ["incomes", String(month), String(year)] as const,
  taxes: (month: string, year: number | string) =>
    ["taxes", String(month), String(year)] as const,
  creditCard: (month: string, year: number | string) =>
    ["credit-card", String(month), String(year)] as const,
  creditCardPurchases: ["credit-card-purchases"] as const,
  investments: (month: string, year: number | string) =>
    ["investments", String(month), String(year)] as const,
  investmentPortfolio: ["investment-portfolio"] as const,
  investmentHistory: ["investment-history"] as const,
  maturedInvestments: ["matured-investments"] as const,
  cdiComparison: (filter: string) => ["cdi-comparison", filter] as const,
  fiiIncome: ["fii-income"] as const,
  fiiRanking: ["fii-ranking"] as const,
  recurringExpenses: ["recurring-expenses"] as const,
  salaryProfiles: ["salary-profiles"] as const,
  paymentChecks: (month: string, year: number | string) =>
    ["payment-checks", String(month), String(year)] as const,
  imports: ["imports"] as const,
};

// Substitui o antigo window.dispatchEvent(new Event("balance-updated")):
// invalida tudo que deriva do estado financeiro (saldo do topo, overview,
// dashboard, portfólio e badge de vencidos). Mutations de cada página devem
// invalidar também as keys do próprio recurso.
export function invalidateFinancialData() {
  queryClient.invalidateQueries({ queryKey: ["financial-overview"] });
  queryClient.invalidateQueries({ queryKey: ["financial-data"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
  queryClient.invalidateQueries({ queryKey: ["monthly-flow"] });
  queryClient.invalidateQueries({ queryKey: ["expenses-by-category"] });
  queryClient.invalidateQueries({ queryKey: queryKeys.investmentPortfolio });
  queryClient.invalidateQueries({ queryKey: queryKeys.maturedInvestments });
}
