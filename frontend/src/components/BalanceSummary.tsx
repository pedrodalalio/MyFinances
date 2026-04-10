import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { api } from "@/utils/api";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

interface BalanceData {
  accountBalance: number;
  investedTotal: number;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function refreshBalanceSummary() {
  window.dispatchEvent(new Event("balance-updated"));
}

export default function BalanceSummary() {
  const [data, setData] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBalance = async () => {
    try {
      const now = new Date();
      const month = (now.getMonth() + 1).toString().padStart(2, "0");
      const year = now.getFullYear();

      const [overviewRes, portfolioRes] = await Promise.all([
        api.get(`/financial-overview/${month}/${year}`),
        api.get("/investments/portfolio"),
      ]);

      const finalBalance =
        overviewRes.data.overview?.financial_data?.final_balance ?? 0;
      const investedTotal =
        portfolioRes.data.portfolio?.summary?.currentValue ?? 0;

      setData({
        accountBalance: finalBalance,
        investedTotal: investedTotal,
      });
    } catch (err) {
      console.error("Erro ao carregar saldo:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();

    const handleUpdate = () => fetchBalance();
    window.addEventListener("balance-updated", handleUpdate);
    return () => window.removeEventListener("balance-updated", handleUpdate);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5">
        <Wallet className="h-4 w-4 text-muted-foreground animate-pulse" />
        <span className="text-sm text-muted-foreground">...</span>
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
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md cursor-default select-none hover:bg-accent transition-colors">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <span
            className={`text-sm font-medium ${
              isNegative ? "text-red-500 dark:text-red-400" : "text-foreground"
            }`}
          >
            {formatCurrency(data.accountBalance)}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        className="bg-popover text-popover-foreground border border-border shadow-md p-3 min-w-[220px]"
      >
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Em conta</span>
            <span
              className={`font-medium ${
                isNegative
                  ? "text-red-500 dark:text-red-400"
                  : "text-foreground"
              }`}
            >
              {formatCurrency(data.accountBalance)}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Investido</span>
            <span className="font-medium text-foreground">
              {formatCurrency(data.investedTotal)}
            </span>
          </div>
          <div className="border-t border-border pt-2 flex justify-between gap-4">
            <span className="font-medium text-foreground">Total</span>
            <span className="font-semibold text-foreground">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
