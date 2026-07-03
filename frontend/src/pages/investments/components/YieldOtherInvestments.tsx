import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import {
  formatCurrency,
  getEffectiveAmount,
  getInvestmentTypeLabel,
  type Investment,
  type InvestmentYieldUpdate,
} from "../types";

interface YieldOtherInvestmentsProps {
  // Lista já ordenada da aba Rendimentos (todos os tipos)
  investments: Investment[];
  yieldUpdates: Record<string, InvestmentYieldUpdate>;
  onFieldChange: (
    investmentId: string,
    field: "gross_yield" | "net_value",
    value: string,
  ) => void;
}

// Demais investimentos (não-ETF, não-FII e não-Tesouro): CDBs e afins,
// com inputs de bruto/líquido por investimento
export function YieldOtherInvestments({
  investments,
  yieldUpdates,
  onFieldChange,
}: YieldOtherInvestmentsProps) {
  const others = investments.filter(
    (inv) =>
      inv.investment_type !== "ETF" &&
      inv.investment_type !== "FII" &&
      inv.investment_type !== "TREASURY",
  );

  return (
    <>
      {others.map((inv) => {
        const update = yieldUpdates[inv.id];
        const currentGross = parseFloat(update?.gross_yield || "0");
        const effectiveAmount = getEffectiveAmount(inv);
        const rendimento = currentGross - effectiveAmount;

        return (
          <div key={inv.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{inv.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {getInvestmentTypeLabel(inv.investment_type)}
                  </Badge>
                  {inv.interest_rate != null && (
                    <Badge variant="secondary" className="text-xs">
                      {inv.interest_rate}% a.a.
                    </Badge>
                  )}
                  {inv.broker && (
                    <span className="text-xs text-muted-foreground">{inv.broker}</span>
                  )}
                </div>
                {inv.updated_at && (
                  <span className="text-xs text-muted-foreground mt-1 block">
                    Atualizado em {new Date(inv.updated_at).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground">Aplicado</span>
                <div className="font-semibold">{formatCurrency(effectiveAmount)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Valor Bruto Atual
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 2685.52"
                  value={update?.gross_yield || ""}
                  onChange={(e) => onFieldChange(inv.id, "gross_yield", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Valor Líquido Atual
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 2569.33"
                  value={update?.net_value || ""}
                  onChange={(e) => onFieldChange(inv.id, "net_value", e.target.value)}
                />
              </div>
            </div>

            {currentGross > 0 &&
              (() => {
                const previousGross = inv.gross_yield ?? effectiveAmount;
                const rendimentoDesdeUltima = currentGross - previousGross;
                return (
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div>
                      Rendimento bruto (total):{" "}
                      <span
                        className={`font-medium ${
                          rendimento >= 0 ? "text-[color:var(--success)]" : "text-destructive"
                        }`}
                      >
                        {formatCurrency(rendimento)} (
                        {((rendimento / effectiveAmount) * 100).toFixed(2)}%)
                      </span>
                    </div>
                    <div>
                      Rendimento desde última atualização:{" "}
                      <span
                        className={`font-medium ${
                          rendimentoDesdeUltima >= 0
                            ? "text-[color:var(--success)]"
                            : "text-destructive"
                        }`}
                      >
                        {formatCurrency(rendimentoDesdeUltima)}
                      </span>
                    </div>
                  </div>
                );
              })()}
          </div>
        );
      })}
    </>
  );
}
