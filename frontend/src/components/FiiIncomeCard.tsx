import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Coins, ArrowRight, CalendarClock } from "lucide-react";
import { api } from "@/utils/api";
import { queryKeys } from "@/lib/query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FiiIncomeData } from "@/components/FiiIncomePanel";
import { formatBRL, formatISODate } from "@/components/FiiIncomePanel";

/**
 * Card compacto de renda passiva dos FIIs no dashboard.
 * Não renderiza nada enquanto carrega ou se o usuário não tem FIIs —
 * o dashboard não deve ganhar um card vazio.
 */
export const FiiIncomeCard = () => {
  const navigate = useNavigate();
  const { data, isError } = useQuery<FiiIncomeData>({
    queryKey: queryKeys.fiiIncome,
    queryFn: async () => (await api.get("/investments/fii-income")).data,
  });

  // Card compacto: em erro continua sem renderizar, mas avisa o usuário
  useEffect(() => {
    if (isError) toast.error("Não foi possível carregar a renda dos FIIs.");
  }, [isError]);

  if (!data || data.funds.length === 0) return null;

  const { summary } = data;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Coins className="h-5 w-5 text-primary" />
          Renda Passiva — FIIs
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/investments?tab=proventos")}
          className="text-primary hover:bg-primary/10"
        >
          Ver detalhes
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-3xl font-bold text-primary">
              {formatBRL(summary.monthly_forecast)}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                /mês
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Estimativa pela média de 12 meses ·{" "}
              {formatBRL(summary.annual_forecast)} por ano
            </p>
          </div>

          {summary.next_payments.length > 0 && (
            <div className="min-w-[220px]">
              <p className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" />
                Dinheiro a caminho ·{" "}
                {formatBRL(summary.next_payments_total)}
              </p>
              <div className="space-y-1">
                {summary.next_payments.slice(0, 3).map((payment) => (
                  <div
                    key={`${payment.ticker}-${payment.ex_date}`}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="px-1.5 py-0 font-mono text-[10px]"
                      >
                        {payment.ticker}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatISODate(payment.payment_date)}
                      </span>
                    </span>
                    <span className="font-medium text-[color:var(--success)]">
                      {formatBRL(payment.total)}
                    </span>
                  </div>
                ))}
                {summary.next_payments.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{summary.next_payments.length - 3} outros
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
