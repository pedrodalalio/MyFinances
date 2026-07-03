import { ArrowRight, Loader2, Save, TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { formatCurrency, getInvestmentTypeLabel, type YieldChange } from "../types";

interface YieldSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changes: YieldChange[];
  saving: boolean;
  onConfirm: () => void;
}

// Modal de resumo das mudanças nos rendimentos antes de salvar
export function YieldSummaryDialog({
  open,
  onOpenChange,
  changes,
  saving,
  onConfirm,
}: YieldSummaryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Resumo das Alterações</DialogTitle>
          <DialogDescription>
            Confira as mudanças nos rendimentos antes de salvar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {changes.map((change) => (
            <div key={change.id} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-foreground">{change.name}</span>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {getInvestmentTypeLabel(change.type)}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  {change.grossYieldDiff >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-[color:var(--success)]" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                  <span
                    className={`text-sm font-semibold ${
                      change.grossYieldDiff >= 0
                        ? "text-[color:var(--success)]"
                        : "text-destructive"
                    }`}
                  >
                    {change.grossYieldDiff >= 0 ? "+" : ""}
                    {formatCurrency(change.grossYieldDiff)}
                  </span>
                </div>
              </div>

              {/* Valor Bruto */}
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground w-20">Bruto</span>
                <span className="text-foreground">
                  {formatCurrency(change.previousGrossYield)}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium text-foreground">
                  {formatCurrency(change.newGrossYield)}
                </span>
                <span
                  className={`text-xs ${
                    change.grossYieldDiffPercent >= 0
                      ? "text-[color:var(--success)]"
                      : "text-destructive"
                  }`}
                >
                  ({change.grossYieldDiffPercent >= 0 ? "+" : ""}
                  {change.grossYieldDiffPercent.toFixed(2)}%)
                </span>
              </div>

              {/* Valor Líquido (só mostra se mudou) */}
              {Math.abs(change.netValueDiff) > 0.001 && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground w-20">Líquido</span>
                  <span className="text-foreground">
                    {formatCurrency(change.previousNetValue)}
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium text-foreground">
                    {formatCurrency(change.newNetValue)}
                  </span>
                  <span
                    className={`text-xs ${
                      change.netValueDiffPercent >= 0
                        ? "text-[color:var(--success)]"
                        : "text-destructive"
                    }`}
                  >
                    ({change.netValueDiffPercent >= 0 ? "+" : ""}
                    {change.netValueDiffPercent.toFixed(2)}%)
                  </span>
                </div>
              )}
            </div>
          ))}

          {/* Resumo Total */}
          {changes.length > 0 &&
            (() => {
              const totalPrevGross = changes.reduce((s, c) => s + c.previousGrossYield, 0);
              const totalNewGross = changes.reduce((s, c) => s + c.newGrossYield, 0);
              const totalGrossDiff = totalNewGross - totalPrevGross;
              const totalGrossDiffPercent =
                totalPrevGross !== 0 ? (totalGrossDiff / totalPrevGross) * 100 : 0;

              return (
                <div className="border-t border-border pt-4 space-y-2">
                  <h4 className="font-semibold text-foreground">Resumo Total</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Valor Anterior</p>
                      <p className="font-medium text-foreground">
                        {formatCurrency(totalPrevGross)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Novo Valor</p>
                      <p className="font-medium text-foreground">
                        {formatCurrency(totalNewGross)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Diferença</p>
                      <p
                        className={`font-semibold ${
                          totalGrossDiff >= 0
                            ? "text-[color:var(--success)]"
                            : "text-destructive"
                        }`}
                      >
                        {totalGrossDiff >= 0 ? "+" : ""}
                        {formatCurrency(totalGrossDiff)} (
                        {totalGrossDiffPercent >= 0 ? "+" : ""}
                        {totalGrossDiffPercent.toFixed(2)}%)
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {changes.length} investimento{changes.length > 1 ? "s" : ""} alterado
                    {changes.length > 1 ? "s" : ""}
                  </p>
                </div>
              );
            })()}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={saving} className="">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Confirmar e Salvar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
