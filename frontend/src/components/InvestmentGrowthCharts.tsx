import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { api } from "@/utils/api";
import { queryKeys } from "@/lib/query";
import QueryError from "@/components/QueryError";
import { TrendingUp } from "lucide-react";

interface SnapshotPoint {
  date: string;
  grossYield: number;
  netValue: number | null;
}

interface InvestmentHistory {
  id: string;
  name: string;
  investmentType: string;
  history: SnapshotPoint[];
}

const TYPE_LABELS: Record<string, string> = {
  STOCKS: "Ações",
  FUNDS: "Fundos",
  CRYPTO: "Crypto",
  SAVINGS: "Poupança",
  CDB: "CDB",
  LCI_LCA: "LCI/LCA",
  DEBENTURES: "Debêntures",
  TREASURY: "Tesouro Direto",
  ETF: "ETF",
  FII: "FII",
  OTHER: "Outros",
};

const TABS: { value: string; label: string; type?: string }[] = [
  { value: "CDB", label: "CDB", type: "CDB" },
  { value: "ETF", label: "ETF", type: "ETF" },
  { value: "FII", label: "FII", type: "FII" },
  { value: "TREASURY", label: "Tesouro Direto", type: "TREASURY" },
  { value: "TOTAL", label: "Total" },
];

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "oklch(0.7 0.15 180)",
  "oklch(0.68 0.18 30)",
  "oklch(0.78 0.13 110)",
  "oklch(0.72 0.14 0)",
  "oklch(0.66 0.15 260)",
];

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function ChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-popover text-popover-foreground border border-border rounded-lg shadow-md p-3 text-sm">
      <p className="font-medium mb-2">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-sm text-muted-foreground text-center py-12">{message}</p>
  );
}

// Soma os snapshots de um grupo de investimentos (mesmo tipo ou mesmo nome) na data dada.
function sumGroupAtDate(invs: InvestmentHistory[], date: string): number {
  return invs.reduce((acc, inv) => {
    const snap = [...inv.history].reverse().find((h) => h.date <= date);
    return acc + (snap ? snap.grossYield : 0);
  }, 0);
}

// Constrói dados para o gráfico de um tipo, unificando investimentos com o mesmo nome em uma linha.
function buildByNameData(invs: InvestmentHistory[]) {
  const byName: Record<string, InvestmentHistory[]> = {};
  invs.forEach((inv) => {
    if (!byName[inv.name]) byName[inv.name] = [];
    byName[inv.name].push(inv);
  });

  const dates = new Set<string>();
  invs.forEach((inv) => inv.history.forEach((h) => dates.add(h.date)));
  const sorted = Array.from(dates).sort();

  const data = sorted.map((date) => {
    const point: Record<string, string | number> = { date: formatDate(date) };
    Object.entries(byName).forEach(([name, group]) => {
      point[name] = sumGroupAtDate(group, date);
    });
    return point;
  });

  return { names: Object.keys(byName), data };
}

export default function InvestmentGrowthCharts() {
  const {
    data: investments = [],
    isPending,
    isError,
    refetch,
  } = useQuery<InvestmentHistory[]>({
    queryKey: queryKeys.investmentHistory,
    queryFn: async () => {
      const response = await api.get("/investments/history");
      return response.data.investments || [];
    },
  });

  if (isPending) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-64 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <QueryError
        message="Não foi possível carregar a evolução dos investimentos."
        onRetry={() => refetch()}
      />
    );
  }

  if (investments.length === 0) return null;

  const byType: Record<string, InvestmentHistory[]> = {};
  investments.forEach((inv) => {
    if (!byType[inv.investmentType]) byType[inv.investmentType] = [];
    byType[inv.investmentType].push(inv);
  });

  const allDates = new Set<string>();
  investments.forEach((inv) =>
    inv.history.forEach((h) => allDates.add(h.date))
  );
  const sortedDates = Array.from(allDates).sort();

  const totalData = sortedDates.map((date) => {
    const point: Record<string, string | number> = { date: formatDate(date) };
    let total = 0;
    Object.entries(byType).forEach(([type, invs]) => {
      const typeTotal = sumGroupAtDate(invs, date);
      point[type] = typeTotal;
      total += typeTotal;
    });
    point["Total"] = total;
    return point;
  });

  const presentTypes = Object.keys(byType);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4" />
          Evolução dos Investimentos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="TOTAL" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.filter((t) => t.type).map((tab) => {
            const invs = byType[tab.type!] || [];
            const { names, data } = buildByNameData(invs);
            return (
              <TabsContent key={tab.value} value={tab.value} className="mt-4">
                {invs.length === 0 ? (
                  <EmptyState
                    message={`Nenhum investimento em ${tab.label} cadastrado`}
                  />
                ) : data.length === 0 ? (
                  <EmptyState message="Atualize os rendimentos para ver a evolução" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="opacity-30"
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        className="text-muted-foreground"
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                        className="text-muted-foreground"
                        width={70}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend />
                      {names.map((name, i) => (
                        <Line
                          key={name}
                          type="monotone"
                          dataKey={name}
                          name={name}
                          stroke={COLORS[i % COLORS.length]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </TabsContent>
            );
          })}

          <TabsContent value="TOTAL" className="mt-4">
            {totalData.length === 0 ? (
              <EmptyState message="Atualize os rendimentos para ver a evolução" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={totalData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                    className="text-muted-foreground"
                    width={70}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend />
                  {presentTypes.map((type, i) => (
                    <Line
                      key={type}
                      type="monotone"
                      dataKey={type}
                      name={TYPE_LABELS[type] || type}
                      stroke={COLORS[i % COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                  <Line
                    type="monotone"
                    dataKey="Total"
                    name="Total"
                    stroke="var(--foreground)"
                    strokeWidth={2.5}
                    strokeDasharray="5 5"
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
