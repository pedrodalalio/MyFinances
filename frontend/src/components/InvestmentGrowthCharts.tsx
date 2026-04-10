import { useEffect, useState } from "react";
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
import { api } from "@/utils/api";
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
  OTHER: "Outros",
};

const COLORS = [
  "var(--chart-1, #2563eb)",
  "var(--chart-2, #16a34a)",
  "var(--chart-3, #dc2626)",
  "var(--chart-4, #ca8a04)",
  "var(--chart-5, #9333ea)",
  "#0891b2",
  "#e11d48",
  "#65a30d",
  "#c026d3",
  "#ea580c",
];

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
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

export default function InvestmentGrowthCharts() {
  const [investments, setInvestments] = useState<InvestmentHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const response = await api.get("/investments/history");
        setInvestments(response.data.investments || []);
      } catch (err) {
        console.error("Erro ao carregar histórico:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-64 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (investments.length === 0) {
    return null;
  }

  // Group investments by type
  const byType: Record<string, InvestmentHistory[]> = {};
  investments.forEach((inv) => {
    if (!byType[inv.investmentType]) byType[inv.investmentType] = [];
    byType[inv.investmentType].push(inv);
  });

  // Build general chart data: merge all dates and sum values
  const allDates = new Set<string>();
  investments.forEach((inv) =>
    inv.history.forEach((h) => allDates.add(h.date))
  );
  const sortedDates = Array.from(allDates).sort();

  const generalData = sortedDates.map((date) => {
    const point: Record<string, string | number> = { date: formatDate(date) };
    let total = 0;

    // Per type totals
    Object.entries(byType).forEach(([type, invs]) => {
      let typeTotal = 0;
      invs.forEach((inv) => {
        const snap = [...inv.history]
          .reverse()
          .find((h) => h.date <= date);
        if (snap) typeTotal += snap.grossYield;
      });
      point[type] = typeTotal;
      total += typeTotal;
    });

    point["Total"] = total;
    return point;
  });

  // Build per-type chart data
  const typeCharts = Object.entries(byType).map(([type, invs]) => {
    const typeDates = new Set<string>();
    invs.forEach((inv) => inv.history.forEach((h) => typeDates.add(h.date)));
    const dates = Array.from(typeDates).sort();

    const data = dates.map((date) => {
      const point: Record<string, string | number> = {
        date: formatDate(date),
      };
      invs.forEach((inv) => {
        const snap = [...inv.history]
          .reverse()
          .find((h) => h.date <= date);
        if (snap) point[inv.name] = snap.grossYield;
      });
      return point;
    });

    return { type, label: TYPE_LABELS[type] || type, investments: invs, data };
  });

  const typeKeys = Object.keys(byType);

  return (
    <div className="space-y-4">
      {/* General Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Evolução Geral dos Investimentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {generalData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={generalData}>
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
                {typeKeys.map((type, i) => (
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
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Atualize os rendimentos para ver a evolução
            </p>
          )}
        </CardContent>
      </Card>

      {/* Per Type Charts */}
      {typeCharts.map(({ type, label, investments: invs, data }, typeIdx) => (
        <Card key={type}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Evolução - {label}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
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
                    tickFormatter={(v) => formatCurrency(v)}
                    className="text-muted-foreground"
                    width={100}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend />
                  {invs.map((inv, i) => (
                    <Line
                      key={inv.id}
                      type="monotone"
                      dataKey={inv.name}
                      name={inv.name}
                      stroke={COLORS[(typeIdx * 3 + i) % COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Atualize os rendimentos mais de uma vez para ver a evolução
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
