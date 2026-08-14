import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import {
  formatCurrency,
  getEffectiveAmount,
  supportsPartialRedeem,
  type RedeemTarget,
} from "../types";
import { useRedeemInvestmentMutation } from "../hooks/useInvestments";

interface RedeemDialogProps {
  investment: RedeemTarget | null;
  mode: "redeem" | "reinvest";
  onClose: () => void;
  // Após resgatar no modo reinvestir, abre o cadastro de um novo investimento
  onReinvest: (source: RedeemTarget, amount: number, purchaseDateISO: string) => void;
}

const todayISO = () => new Date().toISOString().split("T")[0];

// Data sugerida: o vencimento, quando já passou (fluxo do card de vencidos);
// senão hoje, que é o caso do resgate avulso feito pela listagem.
const defaultRedeemDate = (investment: RedeemTarget): string => {
  if (!investment.maturity_date) return todayISO();
  const maturity = investment.maturity_date.split("T")[0];
  return maturity <= todayISO() ? maturity : todayISO();
};

// Dialog de resgate — total ou parcial — de qualquer investimento ativo
export function RedeemDialog({ investment, mode, onClose, onReinvest }: RedeemDialogProps) {
  const [redeemValue, setRedeemValue] = useState<string>("");
  const [redeemDate, setRedeemDate] = useState<string>(todayISO());
  const [currentValueInput, setCurrentValueInput] = useState<string>("");
  const [isPartial, setIsPartial] = useState(false);
  const redeemMutation = useRedeemInvestmentMutation();

  const applied = investment ? getEffectiveAmount(investment) : 0;
  const storedValue = investment
    ? (investment.net_value ?? investment.gross_yield ?? applied)
    : 0;
  // O rendimento guardado é atualizado ~1x por mês, então costuma estar
  // defasado na hora do saque. É ele que define a fatia principal/rendimento
  // do resgate parcial — por isso o campo é editável aqui.
  const parsedCurrentValue = parseFloat(currentValueInput);
  const currentValue =
    !isNaN(parsedCurrentValue) && parsedCurrentValue > 0 ? parsedCurrentValue : storedValue;
  const canPartial =
    investment !== null && mode === "redeem" && supportsPartialRedeem(investment.investment_type);

  // Repovoa ao abrir: sugere o valor cheio da posição e a data do resgate
  useEffect(() => {
    if (!investment) {
      setRedeemValue("");
      setCurrentValueInput("");
      setIsPartial(false);
      return;
    }
    const stored = investment.net_value ?? investment.gross_yield ?? applied;
    setRedeemValue(stored.toString());
    setCurrentValueInput(stored.toString());
    setRedeemDate(defaultRedeemDate(investment));
    setIsPartial(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [investment]);

  const value = parseFloat(redeemValue);
  const valueIsValid = !isNaN(value) && value >= 0 && (!isPartial || value > 0);
  const valueWasRefreshed = isPartial && Math.abs(currentValue - storedValue) >= 0.01;
  // Parcial retira uma fatia proporcional do principal; o resto do valor
  // sacado é rendimento realizado. Espelha o cálculo do backend.
  const consumesWholePosition = !isPartial || currentValue <= 0 || value >= currentValue;
  const fraction = consumesWholePosition || !valueIsValid ? 1 : value / currentValue;
  const principalWithdrawn = applied * fraction;
  const yieldWithdrawn = valueIsValid ? value - principalWithdrawn : 0;
  // O valor cheio entra como receita — o aporte já tinha saído do saldo no mês
  // da aplicação. Espelha redeem-investment.ts.
  const incomeAmount = value;

  const switchMode = (partial: boolean) => {
    setIsPartial(partial);
    // Total volta a sugerir a posição inteira; parcial começa em branco para
    // não induzir o usuário a sacar tudo sem querer.
    setRedeemValue(partial ? "" : currentValue.toString());
  };

  const confirmRedeem = () => {
    if (!investment || !valueIsValid) return;

    redeemMutation.mutate(
      {
        id: investment.id,
        finalValue: value,
        redeemDate,
        partial: isPartial,
        // Só no parcial o valor atual muda alguma coisa: no total, o valor
        // recebido já é a verdade e sobrescreve a posição.
        currentValue: isPartial ? currentValue : undefined,
      },
      {
        onSuccess: ({ outcome }) => {
          const source = investment;
          toast.success(
            outcome.partial
              ? `Resgate de ${formatCurrency(outcome.redeemedValue)} registrado — sobram ${formatCurrency(outcome.remainingNetValue)} aplicados.`
              : `Resgate de ${formatCurrency(outcome.redeemedValue)} registrado.`,
          );

          onClose();
          if (mode === "reinvest") {
            onReinvest(source, value, redeemDate);
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
            {investment?.name} —{" "}
            {mode === "reinvest"
              ? "informe o valor final; ele encerra este investimento e já abre o cadastro de um novo com esse valor."
              : "informe quanto você resgatou e em que data. A entrada é lançada no mês dessa data."}
          </DialogDescription>
        </DialogHeader>

        {investment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Aplicado</p>
                <p className="font-medium">{formatCurrency(applied)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Valor atual registrado</p>
                <p className="font-medium">{formatCurrency(storedValue)}</p>
              </div>
              {investment.maturity_date && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Vencimento</p>
                  <p className="font-medium">
                    {new Date(investment.maturity_date).toLocaleDateString("pt-BR", {
                      timeZone: "UTC",
                    })}
                  </p>
                </div>
              )}
            </div>

            {canPartial && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={isPartial ? "outline" : "default"}
                  size="sm"
                  onClick={() => switchMode(false)}
                >
                  Resgate total
                </Button>
                <Button
                  type="button"
                  variant={isPartial ? "default" : "outline"}
                  size="sm"
                  onClick={() => switchMode(true)}
                >
                  Resgate parcial
                </Button>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {isPartial && (
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-medium">Quanto vale hoje</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={currentValueInput}
                    onChange={(e) => setCurrentValueInput(e.target.value)}
                    placeholder="0,00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Confira no app da corretora. É esse valor que separa quanto do saque é
                    principal e quanto é rendimento — e ele já atualiza a aplicação.
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {isPartial ? "Valor a resgatar" : "Valor final recebido"}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={redeemValue}
                  onChange={(e) => setRedeemValue(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Data do resgate</label>
                <Input
                  type="date"
                  value={redeemDate}
                  onChange={(e) => setRedeemDate(e.target.value)}
                />
              </div>
            </div>

            {valueIsValid && value > 0 && (
              <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
                {isPartial && !consumesWholePosition ? (
                  <p>
                    Sobra <strong>{formatCurrency(applied - principalWithdrawn)}</strong> aplicado (
                    {formatCurrency(currentValue - value)} de valor atual) e a aplicação segue
                    ativa.
                  </p>
                ) : (
                  <p>
                    {isPartial
                      ? "Esse valor é a posição inteira — a aplicação será encerrada."
                      : "A aplicação será encerrada."}
                  </p>
                )}
                {valueWasRefreshed && (
                  <p className="text-muted-foreground">
                    Valor da aplicação atualizado de {formatCurrency(storedValue)} para{" "}
                    {formatCurrency(currentValue)}.
                  </p>
                )}
                <p className="text-muted-foreground">
                  Entra como receita do mês: <strong>{formatCurrency(incomeAmount)}</strong> (
                  {formatCurrency(principalWithdrawn)} de principal +{" "}
                  {formatCurrency(yieldWithdrawn)} de rendimento).
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={confirmRedeem} disabled={redeemLoading || !valueIsValid}>
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
