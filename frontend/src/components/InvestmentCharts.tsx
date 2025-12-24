import React, { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface Investment {
  id: string;
  name: string;
  investment_type: string;
  initial_investment?: number;
  gross_yield?: number;
  amount: number;
  purchase_date?: string;
}

interface InvestmentChartsProps {
  investments: Investment[];
}

const formatCurrency = (value: number): string => {
  return (Math.round(value * 100) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

const getInvestmentTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    CDB: "CDB",
    TREASURY: "Tesouro Direto",
    LCI_LCA: "LCI/LCA",
    SAVINGS: "Poupança",
    STOCKS: "Ações",
    FUNDS: "Fundos",
    CRYPTO: "Crypto",
    DEBENTURES: "Debêntures",
    OTHER: "Outros"
  };
  return labels[type] || type;
};


const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042',
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c',
  '#8dd1e1', '#d084d0'
];

export const InvestmentCharts: React.FC<InvestmentChartsProps> = ({
  investments
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"type" | "individual">("type");

  // Filtrar investimentos baseado na seleção
  const filteredInvestments = React.useMemo(() => {
    if (selectedFilter === "all") return investments;
    return investments.filter(inv => inv.investment_type === selectedFilter);
  }, [investments, selectedFilter]);

  // Tipos disponíveis para filtro
  const availableTypes = React.useMemo(() => {
    const types = Array.from(new Set(investments.map(inv => inv.investment_type)));
    return types.map(type => ({ value: type, label: getInvestmentTypeLabel(type) }));
  }, [investments]);
  // Dados para distribuição
  const distributionData = React.useMemo(() => {
    if (viewMode === "type") {
      // Distribuição por tipo de investimento
      const typeMap = new Map<string, number>();

      filteredInvestments.forEach(investment => {
        const type = getInvestmentTypeLabel(investment.investment_type);
        const value = investment.gross_yield || investment.amount;
        const current = typeMap.get(type) || 0;
        typeMap.set(type, current + Number(value));
      });

      return Array.from(typeMap.entries()).map(([name, value]) => ({
        name,
        fullName: name,
        value,
        percentage: 0
      }));
    } else {
      // Distribuição por investimento individual
      return filteredInvestments.map((investment) => ({
        name: investment.name.length > 20 ? investment.name.substring(0, 20) + '...' : investment.name,
        fullName: investment.name,
        value: investment.gross_yield || investment.amount,
        percentage: 0,
        investmentId: investment.id
      }));
    }
  }, [filteredInvestments, viewMode]);

  // Calcular percentuais
  const totalValue = distributionData.reduce((sum, item) => sum + Number(item.value), 0);
  const distributionDataWithPercentage = distributionData.map(item => ({
    ...item,
    percentage: totalValue > 0 ? (Number(item.value) / totalValue) * 100 : 0
  }));

  // Dados para o gráfico de rentabilidade por investimento
  const profitabilityData = React.useMemo(() => {
    return filteredInvestments.map(investment => {
      const initialValue = Number(investment.amount);
      const currentValue = Number(investment.gross_yield || investment.amount);
      const profit = currentValue - initialValue;
      const profitPercentage = initialValue > 0 ? (profit / initialValue) * 100 : 0;

      return {
        name: investment.name.length > 15 ? investment.name.substring(0, 15) + '...' : investment.name,
        fullName: investment.name,
        investido: initialValue,
        atual: currentValue,
        rentabilidade: profitPercentage,
      };
    });
  }, [filteredInvestments]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-2 shadow-md">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.dataKey === 'value' || entry.dataKey === 'investido' || entry.dataKey === 'atual'
                ? formatCurrency(entry.value)
                : entry.dataKey === 'rentabilidade'
                ? `${entry.value.toFixed(2)}%`
                : entry.value
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-md max-w-xs">
          <p className="font-medium text-sm break-words">{data.fullName || data.name}</p>
          <p className="text-sm">{formatCurrency(data.value)}</p>
          <p className="text-sm text-muted-foreground">{data.percentage.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  if (investments.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Adicione investimentos para ver os gráficos
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rentabilidade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Adicione investimentos para ver os gráficos
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controles de filtro */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4 items-center">
          <Select value={selectedFilter} onValueChange={setSelectedFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {availableTypes.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button
              variant={viewMode === "type" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("type")}
            >
              Por Tipo
            </Button>
            <Button
              variant={viewMode === "individual" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("individual")}
            >
              Individual
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gráfico de Pizza - Distribuição */}
        <Card>
          <CardHeader>
            <CardTitle>
              {viewMode === "type" ? "Distribuição por Tipo" : "Distribuição por Investimento"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={distributionDataWithPercentage}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ percentage }) => percentage > 5 ? `${percentage.toFixed(1)}%` : ''}
                  outerRadius={viewMode === "individual" ? 60 : 80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {distributionDataWithPercentage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={viewMode === "individual" ? 120 : 80}
                  formatter={(value: string, entry: any) => {
                    const data = distributionDataWithPercentage.find(item => item.name === value);
                    return `${data?.fullName || value}`;
                  }}
                  wrapperStyle={{
                    paddingTop: "20px",
                    fontSize: viewMode === "individual" ? "10px" : "12px",
                    lineHeight: "14px"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Barras - Rentabilidade por Investimento */}
        <Card>
          <CardHeader>
            <CardTitle>Rentabilidade por Investimento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={profitabilityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="rentabilidade" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Barras Comparativo - Valor Investido vs Atual */}
      {profitabilityData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Valor Investido vs Valor Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={profitabilityData} margin={{ bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="investido" fill="#82ca9d" name="Investido" />
                <Bar dataKey="atual" fill="#8884d8" name="Atual" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tabela de Resumo */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo Detalhado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Investimento</th>
                  <th className="text-right p-2">Tipo</th>
                  <th className="text-right p-2">Valor Investido</th>
                  <th className="text-right p-2">Valor Atual</th>
                  <th className="text-right p-2">Retorno</th>
                  <th className="text-right p-2">%</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvestments.map((investment) => {
                  const initialValue = Number(investment.amount);
                  const currentValue = Number(investment.gross_yield || investment.amount);
                  const totalReturn = currentValue - initialValue;
                  const returnPercentage = initialValue > 0 ? (totalReturn / initialValue) * 100 : 0;

                  return (
                    <tr key={investment.id} className="border-b">
                      <td className="p-2 font-medium">{investment.name}</td>
                      <td className="text-right p-2">
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {getInvestmentTypeLabel(investment.investment_type)}
                        </span>
                      </td>
                      <td className="text-right p-2">{formatCurrency(initialValue)}</td>
                      <td className="text-right p-2">{formatCurrency(currentValue)}</td>
                      <td className={`text-right p-2 ${totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(totalReturn)}
                      </td>
                      <td className={`text-right p-2 ${returnPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {returnPercentage.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};