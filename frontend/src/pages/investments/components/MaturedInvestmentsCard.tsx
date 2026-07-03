import { AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  formatCurrency,
  getInvestmentTypeLabel,
  type MaturedInvestment,
} from "../types";

interface MaturedInvestmentsCardProps {
  investments: MaturedInvestment[];
  onRedeem: (investment: MaturedInvestment) => void;
  onReinvest: (investment: MaturedInvestment) => void;
}

// Investimentos vencidos pendentes de resgate
export function MaturedInvestmentsCard({
  investments,
  onRedeem,
  onReinvest,
}: MaturedInvestmentsCardProps) {
  if (investments.length === 0) return null;

  return (
    <Card className="border-amber-500/60 bg-amber-50/40 dark:bg-amber-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5" />
          Investimentos vencidos pendentes
          <Badge variant="secondary" className="ml-1">
            {investments.length}
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Informe o valor final para que o dinheiro volte ao seu saldo como uma entrada.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {investments.map((inv) => {
          const projected = inv.net_value ?? inv.gross_yield ?? inv.amount;
          return (
            <div
              key={inv.id}
              className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-lg border bg-background p-4"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{inv.name}</span>
                  <Badge variant="outline">
                    {getInvestmentTypeLabel(inv.investment_type)}
                  </Badge>
                  {inv.broker && (
                    <Badge variant="secondary" className="text-xs">
                      {inv.broker}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Venceu em{" "}
                  {inv.maturity_date
                    ? new Date(inv.maturity_date).toLocaleDateString("pt-BR")
                    : "—"}
                  {" · "}Aplicado: {formatCurrency(inv.amount)}
                  {" · "}Projeção: {formatCurrency(projected)}
                </div>
              </div>
              <div className="flex gap-2 md:justify-end">
                <Button size="sm" variant="outline" onClick={() => onReinvest(inv)}>
                  <RotateCcw className="mr-2 h-3.5 w-3.5" />
                  Reinvestir
                </Button>
                <Button size="sm" onClick={() => onRedeem(inv)}>
                  <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                  Resgatar
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
