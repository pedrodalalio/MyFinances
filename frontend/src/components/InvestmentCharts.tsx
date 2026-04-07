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
import { Button } from "@/components/ui/button";

interface Investment {
  id: string;
  name: string;
  investment_type: string;
  initial_investment?: number;
  gross_yield?: number;
  net_value?: number;
  amount: number;
  quantity?: number;
  interest_rate?: number;
  broker?: string;
  ticker?: string;
  purchase_date?: string;
}

const getEffectiveAmount = (inv: Investment): number => {
  if (inv.investment_type === "ETF" && inv.quantity) {
    return inv.amount * inv.quantity;
  }
  return inv.amount;
};

interface InvestmentChartsProps {
  investments: Investment[];
  selectedFilter: string;
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
    ETF: "ETF",
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
  investments,
  selectedFilter
}) => {
  const [viewMode, setViewMode] = useState<"type" | "rate" | "individual">("rate");

  // Quando muda o filtro, ajustar o viewMode automaticamente
  const effectiveViewMode = selectedFilter === "all" ? "rate" : (selectedFilter === "ETF" && viewMode === "rate" ? "type" : viewMode);

  // Filtrar investimentos baseado na seleção
  const filteredInvestments = React.useMemo(() => {
    if (selectedFilter === "all") return investments;
    return investments.filter(inv => inv.investment_type === selectedFilter);
  }, [investments, selectedFilter]);

  // Dados para distribuição
  const distributionData = React.useMemo(() => {
    if (effectiveViewMode === "type") {
      const isETFFilter = selectedFilter === "ETF";
      const typeMap = new Map<string, number>();
      filteredInvestments.forEach(investment => {
        const key = isETFFilter
          ? (investment.ticker || investment.name)
          : getInvestmentTypeLabel(investment.investment_type);
        const effectiveAmount = getEffectiveAmount(investment);
        const value = investment.gross_yield || effectiveAmount;
        typeMap.set(key, (typeMap.get(key) || 0) + Number(value));
      });
      return Array.from(typeMap.entries()).map(([name, value]) => ({
        name, fullName: name, value, percentage: 0
      }));
    } else if (effectiveViewMode === "rate") {
      const rateMap = new Map<string, number>();
      filteredInvestments.forEach(investment => {
        const rate = investment.interest_rate != null ? `${investment.interest_rate}%` : "Sem taxa";
        const label = `${getInvestmentTypeLabel(investment.investment_type)} ${rate}`;
        const effectiveAmount = getEffectiveAmount(investment);
        const value = investment.gross_yield || effectiveAmount;
        rateMap.set(label, (rateMap.get(label) || 0) + Number(value));
      });
      return Array.from(rateMap.entries()).map(([name, value]) => ({
        name, fullName: name, value, percentage: 0
      }));
    } else {
      return filteredInvestments.map((investment) => {
        const effectiveAmount = getEffectiveAmount(investment);
        return {
          name: investment.name.length > 20 ? investment.name.substring(0, 20) + '...' : investment.name,
          fullName: investment.name,
          value: investment.gross_yield || effectiveAmount,
          percentage: 0,
          investmentId: investment.id
        };
      });
    }
  }, [filteredInvestments, effectiveViewMode]);

  // Calcular percentuais
  const totalValue = distributionData.reduce((sum, item) => sum + Number(item.value), 0);
  const distributionDataWithPercentage = distributionData.map(item => ({
    ...item,
    percentage: totalValue > 0 ? (Number(item.value) / totalValue) * 100 : 0
  }));

  // Dados para o gráfico de rentabilidade por investimento
  const profitabilityData = React.useMemo(() => {
    return filteredInvestments.map(investment => {
      const initialValue = getEffectiveAmount(investment);
      const currentValue = Number(investment.gross_yield || initialValue);
      const netValue = Number(investment.net_value || investment.gross_yield || initialValue);
      const profit = currentValue - initialValue;
      const profitPercentage = initialValue > 0 ? (profit / initialValue) * 100 : 0;

      return {
        name: investment.name.length > 15 ? investment.name.substring(0, 15) + '...' : investment.name,
        fullName: investment.name,
        investido: initialValue,
        bruto: currentValue,
        liquido: netValue,
        rentabilidade: profitPercentage,
      };
    });
  }, [filteredInvestments]);

  // Dados agrupados por taxa para gráfico de barras e tabela
  const groupedByRate = React.useMemo(() => {
    const groups = new Map<string, { label: string; investido: number; bruto: number; liquido: number; count: number }>();
    filteredInvestments.forEach((inv) => {
      const rate = inv.interest_rate != null ? `${inv.interest_rate}%` : "Sem taxa";
      const label = `${getInvestmentTypeLabel(inv.investment_type)} ${rate}`;
      const existing = groups.get(label);
      const amount = getEffectiveAmount(inv);
      const gross = Number(inv.gross_yield || amount);
      const net = Number(inv.net_value || inv.gross_yield || amount);
      if (existing) {
        existing.investido += amount;
        existing.bruto += gross;
        existing.liquido += net;
        existing.count++;
      } else {
        groups.set(label, { label, investido: amount, bruto: gross, liquido: net, count: 1 });
      }
    });
    return Array.from(groups.values()).sort((a, b) => b.investido - a.investido);
  }, [filteredInvestments]);

  // Dados para barras: agrupado quando "rate", individual quando não
  const barChartData = React.useMemo(() => {
    if (effectiveViewMode === "rate") {
      return groupedByRate.map((g) => ({
        name: g.label.length > 20 ? g.label.substring(0, 20) + '...' : g.label,
        fullName: g.label,
        investido: g.investido,
        bruto: g.bruto,
        liquido: g.liquido,
        rentabilidade: g.investido > 0 ? ((g.bruto - g.investido) / g.investido) * 100 : 0,
      }));
    }
    return profitabilityData;
  }, [effectiveViewMode, groupedByRate, profitabilityData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-2 shadow-md">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.dataKey === 'value' || entry.dataKey === 'investido' || entry.dataKey === 'bruto' || entry.dataKey === 'liquido'
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
      {/* Controles de visualização */}
      {selectedFilter !== "all" && (
        <div className="flex gap-2">
          <Button
            variant={viewMode === "type" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("type")}
          >
            Por Tipo
          </Button>
          {selectedFilter !== "ETF" && (
            <Button
              variant={viewMode === "rate" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("rate")}
            >
              Por Taxa
            </Button>
          )}
          <Button
            variant={viewMode === "individual" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("individual")}
          >
            Individual
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gráfico de Pizza - Distribuição */}
        <Card>
          <CardHeader>
            <CardTitle>
              {effectiveViewMode === "type" ? "Distribuição por Tipo" : effectiveViewMode === "rate" ? "Distribuição por Taxa" : "Distribuição por Investimento"}
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
                  outerRadius={effectiveViewMode === "type" ? 80 : 60}
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
                  height={effectiveViewMode === "type" ? 80 : 120}
                  formatter={(value: string, entry: any) => {
                    const data = distributionDataWithPercentage.find(item => item.name === value);
                    return `${data?.fullName || value}`;
                  }}
                  wrapperStyle={{
                    paddingTop: "20px",
                    fontSize: effectiveViewMode === "type" ? "12px" : "10px",
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
              <BarChart data={barChartData}>
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

      {/* Gráfico de Barras Comparativo - Investido vs Bruto vs Líquido */}
      {barChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Investido vs Bruto vs Líquido</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData} margin={{ bottom: 80 }}>
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
                <Legend />
                <Bar dataKey="investido" fill="#94a3b8" name="Investido" />
                <Bar dataKey="bruto" fill="#8884d8" name="Bruto" />
                <Bar dataKey="liquido" fill="#22c55e" name="Líquido" />
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
            {effectiveViewMode === "rate" ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Grupo</th>
                    <th className="text-right p-2">Qtd</th>
                    <th className="text-right p-2">Aplicado</th>
                    <th className="text-right p-2">Bruto</th>
                    <th className="text-right p-2">Líquido</th>
                    <th className="text-right p-2">Retorno</th>
                    <th className="text-right p-2">%</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedByRate.map((group) => {
                    const totalReturn = group.bruto - group.investido;
                    const returnPercentage = group.investido > 0 ? (totalReturn / group.investido) * 100 : 0;
                    return (
                      <tr key={group.label} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{group.label}</td>
                        <td className="text-right p-2">{group.count}</td>
                        <td className="text-right p-2">{formatCurrency(group.investido)}</td>
                        <td className="text-right p-2">{formatCurrency(group.bruto)}</td>
                        <td className="text-right p-2 text-green-600 font-medium">{formatCurrency(group.liquido)}</td>
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
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Investimento</th>
                    <th className="text-right p-2">Tipo</th>
                    <th className="text-right p-2">Corretora</th>
                    <th className="text-right p-2">Taxa</th>
                    <th className="text-right p-2">Aplicado</th>
                    <th className="text-right p-2">Bruto</th>
                    <th className="text-right p-2">Líquido</th>
                    <th className="text-right p-2">Retorno</th>
                    <th className="text-right p-2">%</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvestments.map((investment) => {
                    const initialValue = getEffectiveAmount(investment);
                    const currentValue = Number(investment.gross_yield || initialValue);
                    const netValue = Number(investment.net_value || investment.gross_yield || initialValue);
                    const totalReturn = currentValue - initialValue;
                    const returnPercentage = initialValue > 0 ? (totalReturn / initialValue) * 100 : 0;

                    return (
                      <tr key={investment.id} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{investment.name}</td>
                        <td className="text-right p-2">
                          <span className="text-xs bg-muted px-2 py-1 rounded">
                            {getInvestmentTypeLabel(investment.investment_type)}
                          </span>
                        </td>
                        <td className="text-right p-2 text-xs text-muted-foreground">
                          {investment.broker || "—"}
                        </td>
                        <td className="text-right p-2 text-xs text-muted-foreground">
                          {investment.interest_rate != null ? `${investment.interest_rate}%` : "—"}
                        </td>
                        <td className="text-right p-2">{formatCurrency(initialValue)}</td>
                        <td className="text-right p-2">{formatCurrency(currentValue)}</td>
                        <td className="text-right p-2 text-green-600 font-medium">{formatCurrency(netValue)}</td>
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
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};