import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import QueryError from "@/components/QueryError";

import { formatCurrency, getInvestmentTypeLabel, type CdiComparisonPoint } from "../types";
import { useCdiComparisonQuery } from "../hooks/useInvestments";

// Cores por identidade, vindas dos tokens de gráfico do tema (ajustados por
// modo claro/escuro): verde = rendimento real, azul = benchmark CDI.
const ACTUAL_COLOR = "var(--chart-1)";
const CDI_COLOR = "var(--chart-2)";
const INVESTED_COLOR = "var(--muted-foreground)";

const formatAxisDate = (iso: string): string => {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
};

const formatFullDate = (iso: string): string => {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("pt-BR");
};

const formatCompactCurrency = (value: number): string =>
  `R$ ${new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value)}`;

interface TooltipEntry {
  dataKey: string;
  name: string;
  value: number;
  color: string;
}

const ChartTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-background border border-border rounded-lg p-3 shadow-md text-sm">
      <p className="font-medium mb-1">{label ? formatFullDate(label) : ""}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{formatCurrency(entry.value)}</span>
        </p>
      ))}
    </div>
  );
};

interface CdiComparisonChartProps {
  filter: string;
}

export function CdiComparisonChart({ filter }: CdiComparisonChartProps) {
  const query = useCdiComparisonQuery(filter);
  const series: CdiComparisonPoint[] = useMemo(() => query.data?.series ?? [], [query.data]);
  const summary = query.data?.summary ?? null;
  const flaggedCount: number = query.data?.flaggedCount ?? 0;

  const filterLabel = filter === "all" ? "todos os investimentos" : getInvestmentTypeLabel(filter);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle>Comparativo com 100% do CDI</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Evolução de {filterLabel} vs. o mesmo valor rendendo CDI desde cada aplicação
          </p>
          {flaggedCount > 0 && (
            <p className="text-xs text-[color:var(--warning)] mt-1">
              {flaggedCount}{" "}
              {flaggedCount === 1
                ? "investimento de renda fixa foi ignorado nesta comparação por estar com valor atual menor que o aplicado (possível resgate parcial não abatido)."
                : "investimentos de renda fixa foram ignorados nesta comparação por estarem com valor atual menor que o aplicado (possível resgate parcial não abatido)."}
            </p>
          )}
        </div>
        {summary?.percentOfCdi != null && (
          <div className="text-right shrink-0">
            <p className="text-2xl font-semibold">{summary.percentOfCdi.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">do CDI</p>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {query.isError ? (
          <QueryError onRetry={() => query.refetch()} />
        ) : query.isLoading ? (
          <div className="flex items-center justify-center h-72 text-muted-foreground">
            Carregando série do CDI...
          </div>
        ) : series.length < 2 || !summary ? (
          <div className="flex items-center justify-center h-72 text-center text-muted-foreground">
            Sem dados suficientes para comparar. Registre a data de aplicação e
            atualize os rendimentos para acompanhar a evolução.
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={series} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatAxisDate}
                  minTickGap={32}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatCompactCurrency}
                  domain={["auto", "auto"]}
                  width={72}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Line
                  type="monotone"
                  dataKey="invested"
                  name="Aplicado"
                  stroke={INVESTED_COLOR}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="cdi"
                  name="100% do CDI"
                  stroke={CDI_COLOR}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Seu rendimento"
                  stroke={ACTUAL_COLOR}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Aplicado</p>
                <p className="font-semibold">{formatCurrency(summary.totalInvested)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: ACTUAL_COLOR }}
                  />
                  Seu rendimento
                </p>
                <p className="font-semibold">
                  {formatCurrency(summary.currentValue)}
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    {summary.actualReturn >= 0 ? "+" : ""}
                    {formatCurrency(summary.actualReturn)} ({summary.actualReturnPct.toFixed(2)}%)
                  </span>
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: CDI_COLOR }}
                  />
                  A 100% do CDI
                </p>
                <p className="font-semibold">
                  {formatCurrency(summary.cdiValue)}
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    {summary.cdiReturn >= 0 ? "+" : ""}
                    {formatCurrency(summary.cdiReturn)} ({summary.cdiReturnPct.toFixed(2)}%)
                  </span>
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
