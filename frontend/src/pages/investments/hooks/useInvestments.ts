import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/utils/api";
import { invalidateFinancialData, queryKeys } from "@/lib/query";
import type {
  CdiComparison,
  InvestmentHistory,
  MaturedInvestment,
  Portfolio,
  RedeemOutcome,
} from "../types";

export function usePortfolioQuery() {
  return useQuery({
    queryKey: queryKeys.investmentPortfolio,
    queryFn: async (): Promise<Portfolio> => {
      const response = await api.get("/investments/portfolio");
      return response.data.portfolio;
    },
  });
}

export function useMaturedInvestmentsQuery() {
  return useQuery({
    queryKey: queryKeys.maturedInvestments,
    queryFn: async (): Promise<MaturedInvestment[]> => {
      const response = await api.get("/investments/matured");
      return response.data.investments || [];
    },
  });
}

export function useInvestmentHistoryQuery() {
  return useQuery({
    queryKey: queryKeys.investmentHistory,
    queryFn: async (): Promise<InvestmentHistory[]> => {
      const response = await api.get("/investments/history");
      return response.data.investments || [];
    },
  });
}

// Comparação do rendimento real com 100% do CDI (obedece o filtro de tipo).
// A série do CDI vem do Banco Central via backend — muda no máximo 1x por dia,
// então o staleTime pode ser generoso.
export function useCdiComparisonQuery(filter: string) {
  return useQuery({
    queryKey: queryKeys.cdiComparison(filter),
    queryFn: async (): Promise<CdiComparison> => {
      const response = await api.get("/investments/cdi-comparison", {
        params: filter !== "all" ? { type: filter } : {},
      });
      return response.data;
    },
    staleTime: 5 * 60_000,
  });
}

// Invalida tudo que uma escrita em investimentos afeta: o histórico de
// snapshots, a comparação com CDI e os dados financeiros (saldo, portfólio
// e badge de vencidos).
function useInvalidateInvestments() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.investmentHistory });
    queryClient.invalidateQueries({ queryKey: ["cdi-comparison"] });
    invalidateFinancialData();
  };
}

export function useCreateInvestmentMutation() {
  const invalidate = useInvalidateInvestments();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post("/monthly-investments", body),
    onSuccess: invalidate,
    onError: () =>
      toast.error("Não foi possível criar o investimento. Tente novamente."),
  });
}

export function useUpdateInvestmentMutation() {
  const invalidate = useInvalidateInvestments();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.put(`/monthly-investments/${id}`, body),
    onSuccess: invalidate,
    onError: () =>
      toast.error("Não foi possível atualizar o investimento. Tente novamente."),
  });
}

export function useDeleteInvestmentMutation() {
  const invalidate = useInvalidateInvestments();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/monthly-investments/${id}`),
    onSuccess: invalidate,
    onError: () =>
      toast.error("Não foi possível excluir o investimento. Tente novamente."),
  });
}

export interface RedeemRequest {
  id: string;
  finalValue: number;
  // yyyy-MM-dd — define em qual mês a entrada do resgate é lançada
  redeemDate: string;
  partial: boolean;
  // Valor conferido na hora do resgate; corrige o rendimento defasado
  currentValue?: number;
}

export function useRedeemInvestmentMutation() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateInvestments();
  return useMutation({
    mutationFn: async ({
      id,
      finalValue,
      redeemDate,
      partial,
      currentValue,
    }: RedeemRequest) => {
      const response = await api.post(`/investments/${id}/redeem`, {
        final_value: finalValue,
        redeem_date: redeemDate,
        partial,
        ...(currentValue !== undefined ? { current_value: currentValue } : {}),
      });
      return response.data as { outcome: RedeemOutcome };
    },
    onSuccess: () => {
      // O resgate cria uma entrada no mês — a listagem de receitas precisa
      // recarregar junto com o resto dos dados financeiros.
      queryClient.invalidateQueries({ queryKey: ["incomes"] });
      invalidate();
    },
    onError: (error) =>
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Não foi possível resgatar o investimento. Tente novamente.",
      ),
  });
}

export interface YieldSaveRequest {
  id: string;
  body: Record<string, number>;
}

export function useSaveYieldsMutation() {
  const invalidate = useInvalidateInvestments();
  return useMutation({
    mutationFn: (requests: YieldSaveRequest[]) =>
      Promise.all(
        requests.map(({ id, body }) => api.put(`/monthly-investments/${id}`, body)),
      ),
    onSuccess: invalidate,
    onError: () =>
      toast.error("Não foi possível salvar os rendimentos. Tente novamente."),
  });
}
