import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieIcon } from "lucide-react";

interface ExpenseData {
  name: string;
  value: number;
  color: string;
  [key: string]: any;
}

interface ExpenseDonutChartProps {
  data: ExpenseData[];
}

const formatCurrency = (value: number): string =>
  (Math.round(value * 100) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const CustomTooltip = ({ active, payload, data }: any) => {
  if (active && payload && payload.length) {
    const itemData = payload[0].payload;
    const total = data.reduce(
      (sum: number, item: ExpenseData) => sum + item.value,
      0,
    );
    const percentage = total > 0 ? (itemData.value / total) * 100 : 0;

    return (
      <div className="rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-lg">
        <div className="flex items-center gap-2">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: itemData.color }}
          />
          <p className="text-sm font-semibold">{itemData.name}</p>
        </div>
        <div className="mt-2 space-y-1 text-xs">
          <p className="flex justify-between gap-4 text-muted-foreground">
            Valor
            <span className="font-display font-semibold tabular text-foreground">
              {formatCurrency(itemData.value)}
            </span>
          </p>
          <p className="flex justify-between gap-4 text-muted-foreground">
            Participação
            <span className="font-mono font-semibold text-foreground">
              {percentage.toFixed(1)}%
            </span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export const ExpenseDonutChart: React.FC<ExpenseDonutChartProps> = ({
  data,
}) => {
  const filteredData = data.filter((item) => item.value > 0);
  const total = filteredData.reduce((sum, item) => sum + item.value, 0);

  if (filteredData.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
        <PieIcon className="size-6" />
        <p className="text-sm">Nenhum gasto registrado neste mês</p>
      </div>
    );
  }

  return (
    <div className="relative h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={filteredData}
            cx="50%"
            cy="50%"
            innerRadius={68}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {filteredData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip data={filteredData} />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Total
        </p>
        <p className="font-display text-xl font-bold tabular">
          {formatCurrency(total)}
        </p>
      </div>
    </div>
  );
};
