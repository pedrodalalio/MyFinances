import { useQuery } from "@tanstack/react-query";
import { Wallet, TrendingUp } from "lucide-react";
import { api } from "@/utils/api";
import { queryKeys } from "@/lib/query";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function BalanceSummary() {
  const now = new Date();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const year = now.getFullYear();

  const { data, isPending: loading } = useQuery({
    queryKey: queryKeys.financialOverview(month, year),
    queryFn: async () => {
      const [overviewRes, portfolioRes] = await Promise.all([
        api.get(`/financial-overview/${month}/${year}`),
        api.get("/investments/portfolio"),
      ]);

      return {
        accountBalance:
          overviewRes.data.overview?.financial_data?.final_balance ?? 0,
        investedTotal:
          portfolioRes.data.portfolio?.summary?.currentValue ?? 0,
      };
    },
  });

  if (loading) {
    return (
      <div className="flex h-9 items-center gap-2 rounded-lg border border-border/60 bg-card/50 px-3">
        <Wallet className="size-4 text-muted-foreground animate-pulse" />
        <span className="text-sm text-muted-foreground">···</span>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const total = data.accountBalance + data.investedTotal;
  const isNegative = data.accountBalance < 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex h-9 items-center gap-2 rounded-lg border border-border/60 bg-card/50 px-3 cursor-default select-none transition-colors hover:border-primary/30 hover:bg-primary/5">
          <Wallet className="size-4 text-primary" />
          <span
            className={cn(
              "text-sm font-semibold tabular",
              isNegative ? "text-destructive" : "text-foreground",
            )}
          >
            {formatCurrency(data.accountBalance)}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        className="border border-border bg-popover p-0 text-popover-foreground shadow-lg"
        sideOffset={8}
      >
        <div className="min-w-[240px] p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Patrimônio
          </p>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Wallet className="size-3.5" /> Em conta
              </span>
              <span
                className={cn(
                  "font-semibold tabular",
                  isNegative ? "text-destructive" : "text-foreground",
                )}
              >
                {formatCurrency(data.accountBalance)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <TrendingUp className="size-3.5" /> Investido
              </span>
              <span className="font-semibold tabular text-foreground">
                {formatCurrency(data.investedTotal)}
              </span>
            </div>
            <div className="mt-2 flex justify-between gap-4 border-t border-border pt-2">
              <span className="font-medium">Total</span>
              <span className="font-display text-base font-bold tabular text-primary">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
