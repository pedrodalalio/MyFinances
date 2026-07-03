import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import {
  formatCurrency,
  getEffectiveAmount,
  getInvestmentTypeLabel,
  type Investment,
} from "../types";

interface YieldTickerGroupProps {
  typeKey: string;
  heading: string;
  // Lista já ordenada da aba Rendimentos (todos os tipos)
  investments: Investment[];
  etfPrices: Record<string, string>;
  onPriceChange: (ticker: string, value: string) => void;
}

// Bloco de atualização por cotação (preço da cota × quantidade), agrupado por
// ticker. Usado tanto para ETF quanto para FII.
export function YieldTickerGroup({
  typeKey,
  heading,
  investments,
  etfPrices,
  onPriceChange,
}: YieldTickerGroupProps) {
  const groupInvestments = investments.filter(
    (inv) => inv.investment_type === typeKey && inv.ticker,
  );
  const tickers = Array.from(new Set(groupInvestments.map((inv) => inv.ticker!)));

  if (tickers.length === 0) return null;

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-sm text-muted-foreground">{heading}</h4>
      {tickers.map((ticker) => {
        const tickerInvestments = groupInvestments.filter((inv) => inv.ticker === ticker);
        const totalCotas = tickerInvestments.reduce((sum, inv) => sum + (inv.quantity || 0), 0);
        const totalInvestido = tickerInvestments.reduce(
          (sum, inv) => sum + getEffectiveAmount(inv),
          0,
        );
        const currentPrice = parseFloat(etfPrices[ticker] || "0");
        const valorAtual = currentPrice > 0 ? currentPrice * totalCotas : 0;
        const rendimento = valorAtual - totalInvestido;
        const previousGrossTotal = tickerInvestments.reduce(
          (sum, inv) => sum + (inv.gross_yield ?? getEffectiveAmount(inv)),
          0,
        );
        const rendimentoDesdeUltima = valorAtual - previousGrossTotal;

        return (
          <div key={ticker} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{ticker}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {getInvestmentTypeLabel(typeKey)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{totalCotas} cotas</span>
                  {tickerInvestments[0]?.broker && (
                    <span className="text-xs text-muted-foreground">
                      {tickerInvestments[0].broker}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground">Total Investido</span>
                <div className="font-semibold">{formatCurrency(totalInvestido)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Preço Atual da Cota (R$)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 48.50"
                  value={etfPrices[ticker] || ""}
                  onChange={(e) => onPriceChange(ticker, e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Valor Atual Total
                </label>
                <div className="h-9 flex items-center font-semibold">
                  {currentPrice > 0 ? formatCurrency(valorAtual) : "—"}
                </div>
              </div>
            </div>

            {currentPrice > 0 && (
              <div className="text-xs text-muted-foreground space-y-0.5 pt-2 border-t">
                <div className="flex justify-between">
                  <span>Bruto atual:</span>
                  <span className="font-medium">{formatCurrency(valorAtual)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Rendimento (total):</span>
                  <span
                    className={`font-medium ${rendimento >= 0 ? "text-[color:var(--success)]" : "text-destructive"}`}
                  >
                    {formatCurrency(rendimento)} (
                    {((rendimento / totalInvestido) * 100).toFixed(2)}%)
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
