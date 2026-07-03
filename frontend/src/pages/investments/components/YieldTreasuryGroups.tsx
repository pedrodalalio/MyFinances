import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import {
  formatCurrency,
  getEffectiveAmount,
  getTreasuryCategoryLabel,
  type Investment,
  type InvestmentYieldUpdate,
} from "../types";

interface YieldTreasuryGroupsProps {
  // Lista já ordenada da aba Rendimentos (todos os tipos)
  investments: Investment[];
  yieldUpdates: Record<string, InvestmentYieldUpdate>;
  onFieldChange: (
    investmentId: string,
    field: "gross_yield" | "net_value",
    value: string,
  ) => void;
}

// Tesouro Direto agrupado por categoria, com inputs individuais por título
export function YieldTreasuryGroups({
  investments,
  yieldUpdates,
  onFieldChange,
}: YieldTreasuryGroupsProps) {
  const treasuryInvestments = investments.filter(
    (inv) => inv.investment_type === "TREASURY",
  );
  const treasuryCategories = Array.from(
    new Set(treasuryInvestments.map((inv) => inv.category || "OUTROS")),
  );

  if (treasuryCategories.length === 0) return null;

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-sm text-muted-foreground">Tesouro Direto</h4>
      {treasuryCategories.map((category) => {
        const categoryInvestments = treasuryInvestments.filter(
          (inv) => (inv.category || "OUTROS") === category,
        );
        const totalInvestido = categoryInvestments.reduce(
          (sum, inv) => sum + getEffectiveAmount(inv),
          0,
        );
        const totalBrutoAnterior = categoryInvestments.reduce(
          (sum, inv) => sum + (inv.gross_yield ?? getEffectiveAmount(inv)),
          0,
        );
        const totalBrutoAtual = categoryInvestments.reduce((sum, inv) => {
          const update = yieldUpdates[inv.id];
          return sum + parseFloat(update?.gross_yield || "0");
        }, 0);
        const totalLiquidoAtual = categoryInvestments.reduce((sum, inv) => {
          const update = yieldUpdates[inv.id];
          return sum + parseFloat(update?.net_value || "0");
        }, 0);
        const rendimentoTotal = totalBrutoAtual - totalInvestido;
        const rendimentoDesdeUltima = totalBrutoAtual - totalBrutoAnterior;

        return (
          <div key={category} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{getTreasuryCategoryLabel(category)}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    Tesouro Direto
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {categoryInvestments.length}{" "}
                    {categoryInvestments.length === 1 ? "título" : "títulos"}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground">Total Investido</span>
                <div className="font-semibold">{formatCurrency(totalInvestido)}</div>
              </div>
            </div>

            {/* Inputs individuais por título */}
            <div className="space-y-3 pl-2 border-l-2 border-muted">
              {categoryInvestments.map((inv) => {
                const update = yieldUpdates[inv.id];
                const effectiveAmount = getEffectiveAmount(inv);
                return (
                  <div key={inv.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{inv.name}</span>
                        {inv.interest_rate != null && (
                          <Badge variant="secondary" className="text-xs">
                            {inv.interest_rate}% a.a.
                          </Badge>
                        )}
                        {inv.maturity_date && (
                          <span className="text-xs text-muted-foreground">
                            Venc.{" "}
                            {new Date(inv.maturity_date).toLocaleDateString("pt-BR", {
                              timeZone: "UTC",
                            })}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Aplicado: {formatCurrency(effectiveAmount)}
                      </span>
                    </div>
                    {inv.updated_at && (
                      <span className="text-xs text-muted-foreground block">
                        Atualizado em {new Date(inv.updated_at).toLocaleDateString("pt-BR")}
                      </span>
                    )}
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
                  </div>
                );
              })}
            </div>

            {/* Totais do grupo */}
            {totalBrutoAtual > 0 && (
              <div className="text-xs text-muted-foreground space-y-0.5 pt-2 border-t">
                <div className="flex justify-between">
                  <span>Bruto atual (grupo):</span>
                  <span className="font-medium">{formatCurrency(totalBrutoAtual)}</span>
                </div>
                {totalLiquidoAtual > 0 && (
                  <div className="flex justify-between">
                    <span>Líquido atual (grupo):</span>
                    <span className="font-medium text-[color:var(--success)]">
                      {formatCurrency(totalLiquidoAtual)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Rendimento (total):</span>
                  <span
                    className={`font-medium ${rendimentoTotal >= 0 ? "text-[color:var(--success)]" : "text-destructive"}`}
                  >
                    {formatCurrency(rendimentoTotal)} (
                    {totalInvestido > 0
                      ? ((rendimentoTotal / totalInvestido) * 100).toFixed(2)
                      : "0.00"}
                    %)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Rendimento desde última atualização:</span>
                  <span
                    className={`font-medium ${rendimentoDesdeUltima >= 0 ? "text-[color:var(--success)]" : "text-destructive"}`}
                  >
                    {formatCurrency(rendimentoDesdeUltima)}
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
