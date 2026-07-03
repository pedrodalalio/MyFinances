import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/utils/api";
import { invalidateFinancialData, queryKeys } from "@/lib/query";
import type { InvestmentHistory, MaturedInvestment, Portfolio } from "../types";

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

// Invalida tudo que uma escrita em investimentos afeta: o histórico de
// snapshots e os dados financeiros (saldo, portfólio e badge de vencidos).
function useInvalidateInvestments() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.investmentHistory });
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

export function useRedeemInvestmentMutation() {
  const invalidate = useInvalidateInvestments();
  return useMutation({
    mutationFn: ({ id, finalValue }: { id: string; finalValue: number }) =>
      api.post(`/investments/${id}/redeem`, { final_value: finalValue }),
    onSuccess: invalidate,
    onError: () =>
      toast.error("Não foi possível resgatar o investimento. Tente novamente."),
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
