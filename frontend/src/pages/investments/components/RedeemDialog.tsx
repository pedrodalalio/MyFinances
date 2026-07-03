import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { formatCurrency, type MaturedInvestment } from "../types";
import { useRedeemInvestmentMutation } from "../hooks/useInvestments";

interface RedeemDialogProps {
  investment: MaturedInvestment | null;
  mode: "redeem" | "reinvest";
  onClose: () => void;
  // Após resgatar no modo reinvestir, abre o cadastro de um novo investimento
  onReinvest: (source: MaturedInvestment, amount: number, purchaseDateISO: string) => void;
}

// Dialog de resgate (ou resgate + reinvestimento) de investimento vencido
export function RedeemDialog({ investment, mode, onClose, onReinvest }: RedeemDialogProps) {
  const [redeemValue, setRedeemValue] = useState<string>("");
  const redeemMutation = useRedeemInvestmentMutation();

  // Sugere o valor projetado ao abrir o diálogo
  useEffect(() => {
    if (!investment) {
      setRedeemValue("");
      return;
    }
    const suggested = investment.net_value ?? investment.gross_yield ?? investment.amount;
    setRedeemValue(suggested.toString());
  }, [investment]);

  const confirmRedeem = () => {
    if (!investment) return;
    const value = parseFloat(redeemValue);
    if (isNaN(value) || value < 0) return;

    redeemMutation.mutate(
      { id: investment.id, finalValue: value },
      {
        onSuccess: () => {
          const source = investment;
          const dateForNew = source.maturity_date
            ? source.maturity_date.split("T")[0]
            : new Date().toISOString().split("T")[0];

          onClose();
          if (mode === "reinvest") {
            onReinvest(source, value, dateForNew);
          }
        },
      },
    );
  };

  const redeemLoading = redeemMutation.isPending;

  return (
    <Dialog open={investment !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "reinvest" ? "Reinvestir" : "Resgatar investimento"}
          </DialogTitle>
          <DialogDescription>
            {investment?.name} — informe o valor final do vencimento. Ele fecha o
            histórico do investimento atual e
            {mode === "reinvest"
              ? " já abre o cadastro de um novo investimento com esse valor."
              : " volta como entrada no seu saldo."}
          </DialogDescription>
        </DialogHeader>

        {investment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Aplicado</p>
                <p className="font-medium">{formatCurrency(investment.amount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Projeção</p>
                <p className="font-medium">
                  {formatCurrency(
                    investment.net_value ?? investment.gross_yield ?? investment.amount,
                  )}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">Vencimento</p>
                <p className="font-medium">
                  {investment.maturity_date
                    ? new Date(investment.maturity_date).toLocaleDateString("pt-BR")
                    : "—"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Valor final recebido</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={redeemValue}
                onChange={(e) => setRedeemValue(e.target.value)}
                placeholder="0,00"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                onClick={confirmRedeem}
                disabled={
                  redeemLoading ||
                  redeemValue === "" ||
                  isNaN(parseFloat(redeemValue)) ||
                  parseFloat(redeemValue) < 0
                }
              >
                {redeemLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {mode === "reinvest" ? "Processando..." : "Resgatando..."}
                  </>
                ) : (
                  <>
                    {mode === "reinvest" ? (
                      <RotateCcw className="h-4 w-4 mr-2" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    {mode === "reinvest"
                      ? "Continuar para novo investimento"
                      : "Confirmar resgate"}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
