import { useState } from "react";
import { Banknote, ChevronDown, ChevronUp, Edit, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  formatCurrency,
  getEffectiveAmount,
  getInvestmentTypeLabel,
  PERIOD_LABEL,
  type Investment,
  type PeriodPreset,
} from "../types";
import type { PortfolioGroup } from "../hooks/usePortfolioMetrics";
import { useDeleteInvestmentMutation } from "../hooks/useInvestments";

interface PortfolioGroupsCardProps {
  groups: PortfolioGroup[];
  periodPreset: PeriodPreset;
  onCreate: () => void;
  onEdit: (investment: Investment) => void;
  onRedeem: (investment: Investment) => void;
}

// Listagem "Meus Investimentos" agrupada por nome + taxa, com
// expandir/resgatar/editar/excluir
export function PortfolioGroupsCard({
  groups,
  periodPreset,
  onCreate,
  onEdit,
  onRedeem,
}: PortfolioGroupsCardProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleteMutation = useDeleteInvestmentMutation();

  if (groups.length === 0) return null;

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Meus Investimentos</CardTitle>
          <Button variant="outline" size="sm" onClick={onCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Investimento
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {groups.map((group) => {
          const isExpanded = expandedGroups.has(group.key);
          const count = group.investments.length;
          const hasPeriodData = group.periodCount > 0;
          const periodReturnValue = hasPeriodData ? group.periodEnd - group.periodStart : 0;
          const periodReturnPct =
            hasPeriodData && group.periodStart > 0
              ? (periodReturnValue / group.periodStart) * 100
              : 0;

          return (
            <div key={group.key} className="border rounded-lg overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleGroup(group.key)}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                  <h4 className="font-semibold">{group.name}</h4>
                  <Badge variant="outline">{getInvestmentTypeLabel(group.type)}</Badge>
                  {group.rate != null && (
                    <Badge variant="secondary" className="text-xs">
                      {group.rate}% a.a.
                    </Badge>
                  )}
                  {group.broker && (
                    <Badge variant="secondary" className="text-xs">
                      {group.broker}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    ({count} {count === 1 ? "aplicação" : "aplicações"})
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-4 text-sm text-right">
                  <div>
                    <span className="text-muted-foreground text-xs block">Aplicado</span>
                    <span className="font-semibold">{formatCurrency(group.totalAmount)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs block">Bruto</span>
                    <span className="font-semibold">{formatCurrency(group.totalGross)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs block">Líquido</span>
                    <span className="font-semibold text-[color:var(--success)]">
                      {formatCurrency(group.totalNet)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs block">
                      Retorno · {PERIOD_LABEL[periodPreset]}
                    </span>
                    {hasPeriodData ? (
                      <span
                        className={`font-semibold ${periodReturnValue >= 0 ? "text-[color:var(--success)]" : "text-destructive"}`}
                      >
                        {periodReturnValue >= 0 ? "+" : ""}
                        {formatCurrency(periodReturnValue)}
                        <span className="text-xs ml-1">({periodReturnPct.toFixed(1)}%)</span>
                      </span>
                    ) : (
                      <span className="font-semibold text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t">
                  {group.investments.map((investment) => (
                    <div
                      key={investment.id}
                      className="p-3 px-4 border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="grid grid-cols-3 md:grid-cols-5 gap-3 text-sm flex-1">
                          <div>
                            <span className="text-muted-foreground text-xs">Aplicado</span>
                            <div className="font-medium">{formatCurrency(investment.amount)}</div>
                          </div>
                          {(investment.investment_type === "ETF" ||
                            investment.investment_type === "FII") &&
                            investment.quantity != null && (
                              <div>
                                <span className="text-muted-foreground text-xs">Cotas</span>
                                <div className="font-medium">{investment.quantity}</div>
                              </div>
                            )}
                          {(investment.investment_type === "ETF" ||
                            investment.investment_type === "FII") &&
                            investment.quantity != null && (
                              <div>
                                <span className="text-muted-foreground text-xs">Total</span>
                                <div className="font-medium">
                                  {formatCurrency(getEffectiveAmount(investment))}
                                </div>
                              </div>
                            )}
                          {investment.investment_type === "TREASURY" &&
                            investment.quantity != null && (
                              <div>
                                <span className="text-muted-foreground text-xs">Títulos</span>
                                <div className="font-medium">{investment.quantity}</div>
                              </div>
                            )}
                          {investment.gross_yield != null && (
                            <div>
                              <span className="text-muted-foreground text-xs">Bruto</span>
                              <div className="font-medium">
                                {formatCurrency(investment.gross_yield)}
                              </div>
                            </div>
                          )}
                          {investment.net_value != null && (
                            <div>
                              <span className="text-muted-foreground text-xs">Líquido</span>
                              <div className="font-medium text-[color:var(--success)]">
                                {formatCurrency(investment.net_value)}
                              </div>
                            </div>
                          )}
                          {investment.purchase_date && (
                            <div>
                              <span className="text-muted-foreground text-xs">Aplicação</span>
                              <div className="font-medium">
                                {new Date(investment.purchase_date).toLocaleDateString("pt-BR", {
                                  timeZone: "UTC",
                                })}
                              </div>
                            </div>
                          )}
                          {investment.maturity_date && (
                            <div>
                              <span className="text-muted-foreground text-xs">Vencimento</span>
                              <div className="font-medium">
                                {new Date(investment.maturity_date).toLocaleDateString("pt-BR", {
                                  timeZone: "UTC",
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          {investment.status === "ACTIVE" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRedeem(investment);
                              }}
                            >
                              <Banknote className="h-4 w-4 mr-1" />
                              Resgatar
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(investment);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {deletingId === investment.id ? (
                            <div
                              className="flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  deleteMutation.mutate(investment.id);
                                  setDeletingId(null);
                                }}
                              >
                                Confirmar
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setDeletingId(null)}>
                                Cancelar
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingId(investment.id);
                              }}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
