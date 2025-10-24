import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface ExpenseData {
  name: string;
  value: number;
  color: string;
  [key: string]: any;
}

interface ExpenseDonutChartProps {
  data: ExpenseData[];
}

const formatCurrency = (value: number): string => {
  return (Math.round(value * 100) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

const CustomTooltip = ({ active, payload, data }: any) => {
  if (active && payload && payload.length) {
    const itemData = payload[0].payload;
    const total = data.reduce((sum: number, item: ExpenseData) => sum + item.value, 0);
    const percentage = total > 0 ? (itemData.value / total) * 100 : 0;

    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900">{itemData.name}</p>
        <p className="text-sm text-gray-600">
          Valor: <span className="font-semibold">{formatCurrency(itemData.value)}</span>
        </p>
        <p className="text-sm text-gray-600">
          Porcentagem: <span className="font-semibold">{percentage.toFixed(1)}%</span>
        </p>
      </div>
    );
  }
  return null;
};

export const ExpenseDonutChart: React.FC<ExpenseDonutChartProps> = ({ data }) => {
  // Filtrar dados com valor maior que 0
  const filteredData = data.filter(item => item.value > 0);

  if (filteredData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Nenhum gasto registrado
      </div>
    );
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={filteredData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {filteredData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip data={filteredData} />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};