import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/utils/api";
import { invalidateFinancialData, queryKeys } from "@/lib/query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RecurringExpenseRow {
  id: string;
  name: string;
  amount: string;
  is_recurring?: boolean;
  recurring_id?: string;
}

interface LinkPaymentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Linha do extrato (ex.: o PIX para a outra conta) a ser vinculada
  transaction: { id: string; description: string; amount: string } | null;
  month: string;
  year: number;
  // Chamado após vincular com sucesso, para o pai atualizar a linha localmente
  onLinked: (transactionId: string) => void;
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export function LinkPaymentsDialog({
  open,
  onOpenChange,
  transaction,
  month,
  year,
  onLinked,
}: LinkPaymentsDialogProps) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Zera a seleção sempre que abrir para uma nova linha
  useEffect(() => {
    if (open) setSelected(new Set());
  }, [open, transaction?.id]);

  const enabled = open && !!transaction;

  const expensesQuery = useQuery({
    queryKey: queryKeys.expenses(month, year),
    queryFn: async () => {
      const r = await api.get(`/expenses/${month}/${year}`);
      return (r.data.expenses || []) as RecurringExpenseRow[];
    },
    enabled,
  });

  const checksQuery = useQuery({
    queryKey: queryKeys.paymentChecks(month, year),
    queryFn: async () => {
      const r = await api.get(`/payment-checks/${month}/${year}`);
      return (r.data.checks || []) as string[];
    },
    enabled,
  });

  const paidKeys = checksQuery.data ?? [];
  // Gastos fixos ativos no mês que ainda NÃO estão pagos
  const options = (expensesQuery.data ?? [])
    .filter((e) => e.is_recurring && e.recurring_id)
    .map((e) => ({
      key: `rec_${e.recurring_id}`,
      name: e.name,
      amount: Number(e.amount),
    }))
    .filter((o) => !paidKeys.includes(o.key));

  const lineAmount = transaction ? Number(transaction.amount) : 0;
  const selectedTotal = options
    .filter((o) => selected.has(o.key))
    .reduce((s, o) => s + o.amount, 0);
  const diff = lineAmount - selectedTotal;
  const exact = Math.abs(diff) < 0.005;

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const linkMutation = useMutation({
    mutationFn: async () =>
      api.post(`/imports/transactions/${transaction!.id}/link-payments`, {
        itemKeys: [...selected],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.paymentChecks(month, year),
      });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      invalidateFinancialData();
      toast.success("Pagamentos vinculados e marcados como pagos.");
      if (transaction) onLinked(transaction.id);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Erro ao vincular pagamentos.",
      );
    },
  });

  const loading = expensesQuery.isLoading || checksQuery.isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vincular a gastos fixos</DialogTitle>
          <DialogDescription>
            {transaction && (
              <>
                Selecione os gastos fixos pagos por este lançamento —{" "}
                <span className="font-medium text-foreground">
                  {transaction.description}
                </span>{" "}
                (R$ {formatCurrency(lineAmount)})
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Carregando gastos fixos…
            </p>
          ) : options.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhum gasto fixo em aberto neste mês.
            </p>
          ) : (
            <div className="border rounded-lg divide-y">
              {options.map((o) => {
                const isSelected = selected.has(o.key);
                return (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => toggle(o.key)}
                    className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-muted/40"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded border ${
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/40"
                        }`}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <span className="text-sm font-medium">{o.name}</span>
                    </span>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      R$ {formatCurrency(o.amount)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Conferência do total */}
          {options.length > 0 && (
            <div
              className={`rounded-lg p-3 text-sm ${
                selected.size === 0
                  ? "bg-muted/40 text-muted-foreground"
                  : exact
                    ? "bg-[color:var(--success)]/10 text-[color:var(--success)]"
                    : "bg-[color:var(--warning)]/10 text-[color:var(--warning)]"
              }`}
            >
              <div className="flex items-center justify-between font-medium">
                <span>Selecionado</span>
                <span>
                  R$ {formatCurrency(selectedTotal)} / {formatCurrency(lineAmount)}
                </span>
              </div>
              {selected.size > 0 && !exact && (
                <p className="mt-1 text-xs">
                  {diff > 0
                    ? `Faltam R$ ${formatCurrency(diff)} para bater com o lançamento.`
                    : `Sobram R$ ${formatCurrency(Math.abs(diff))} em relação ao lançamento.`}
                </p>
              )}
              {selected.size > 0 && exact && (
                <p className="mt-1 text-xs">Bate certinho com o lançamento.</p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => linkMutation.mutate()}
              disabled={selected.size === 0 || linkMutation.isPending}
            >
              {linkMutation.isPending ? "Vinculando…" : "Vincular e marcar como pago"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
