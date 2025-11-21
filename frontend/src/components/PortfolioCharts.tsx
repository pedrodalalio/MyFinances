import React from "react";
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

interface Asset {
  id: string;
  name: string;
  asset_type: string;
  initial_investment: number;
  current_value: number;
  purchase_date: string;
  history: Array<{
    value: number;
    date: string;
  }>;
}

interface PortfolioChartsProps {
  assets: Asset[];
}

const formatCurrency = (value: number): string => {
  return (Math.round(value * 100) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

const getAssetTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    CDB: "CDB",
    TREASURY_DIRECT: "Tesouro Direto",
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

export const PortfolioCharts: React.FC<PortfolioChartsProps> = ({ assets }) => {
  // Verifica se todos os assets são do mesmo tipo
  const assetTypes = [...new Set(assets.map(a => a.asset_type))];
  const isSingleType = assetTypes.length === 1;

  // Dados para distribuição - por tipo OU por asset individual se todos forem do mesmo tipo
  const distributionData = React.useMemo(() => {
    if (isSingleType && assets.length > 1) {
      // Se todos são do mesmo tipo, mostra distribuição por asset individual
      return assets.map((asset, index) => ({
        name: asset.name.length > 20 ? asset.name.substring(0, 20) + '...' : asset.name,
        fullName: asset.name, // Armazena o nome completo para o tooltip
        value: asset.current_value,
        percentage: 0, // Será calculado após termos o total
        assetId: asset.id // Adiciona ID para evitar problemas de mapeamento
      }));
    } else {
      // Se há tipos diferentes, mostra distribuição por tipo
      const typeMap = new Map<string, number>();

      assets.forEach(asset => {
        const type = getAssetTypeLabel(asset.asset_type);
        const current = typeMap.get(type) || 0;
        typeMap.set(type, current + asset.current_value);
      });

      return Array.from(typeMap.entries()).map(([name, value]) => ({
        name,
        fullName: name, // Para tipos, nome e fullName são iguais
        value,
        percentage: 0 // Será calculado após termos o total
      }));
    }
  }, [assets, isSingleType]);

  // Calcular percentuais
  const totalValue = distributionData.reduce((sum, item) => sum + item.value, 0);
  const distributionDataWithPercentage = distributionData.map(item => ({
    ...item,
    percentage: totalValue > 0 ? (item.value / totalValue) * 100 : 0
  }));

  // Dados para o gráfico de rentabilidade por ativo
  const profitabilityData = React.useMemo(() => {
    return assets.map(asset => {
      const profit = asset.current_value - asset.initial_investment;
      const profitPercentage = asset.initial_investment > 0
        ? (profit / asset.initial_investment) * 100
        : 0;

      return {
        name: asset.name.length > 15 ? asset.name.substring(0, 15) + '...' : asset.name,
        investido: asset.initial_investment,
        atual: asset.current_value,
        rentabilidade: profitPercentage,
      };
    });
  }, [assets]);

  // Dados para gráfico de evolução temporal (usando o histórico)
  const evolutionData = React.useMemo(() => {
    const dateMap = new Map<string, number>();

    assets.forEach(asset => {
      // Adiciona data de compra
      const purchaseDate = new Date(asset.purchase_date).toISOString().split('T')[0];
      const current = dateMap.get(purchaseDate) || 0;
      dateMap.set(purchaseDate, current + asset.initial_investment);

      // Adiciona histórico
      asset.history.forEach(h => {
        const date = new Date(h.date).toISOString().split('T')[0];
        // Para simplificar, vamos apenas mostrar o valor total atual na data mais recente
      });
    });

    return Array.from(dateMap.entries())
      .map(([date, value]) => ({
        date: new Date(date).toLocaleDateString('pt-BR'),
        valor: value
      }))
      .sort((a, b) => new Date(a.date.split('/').reverse().join('-')).getTime() -
                      new Date(b.date.split('/').reverse().join('-')).getTime());
  }, [assets]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-2 shadow-md">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.dataKey === 'value' || entry.dataKey === 'valor' || entry.dataKey === 'investido' || entry.dataKey === 'atual'
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

  if (assets.length === 0) {
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
            <CardTitle>Rentabilidade por Ativo</CardTitle>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gráfico de Pizza - Distribuição */}
        <Card>
          <CardHeader>
            <CardTitle>
              {isSingleType && assets.length > 1
                ? "Distribuição por CDB"
                : "Distribuição por Tipo"
              }
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={distributionDataWithPercentage}
                  cx="50%"
                  cy="40%"
                  labelLine={false}
                  label={({ name, percentage }) => percentage > 5 ? `${percentage.toFixed(1)}%` : ''}
                  outerRadius={80}
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
                  height={80}
                  formatter={(value: string, entry: any) => {
                    const data = distributionDataWithPercentage.find(item => item.name === value);
                    return `${data?.fullName || value}`;
                  }}
                  wrapperStyle={{
                    paddingTop: "20px",
                    fontSize: "12px",
                    lineHeight: "16px"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Barras - Rentabilidade por Ativo */}
        <Card>
          <CardHeader>
            <CardTitle>Rentabilidade por Ativo</CardTitle>
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
      <Card>
        <CardHeader>
          <CardTitle>Valor Investido vs Valor Atual</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
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
                  <th className="text-left p-2">
                    {isSingleType && assets.length > 1 ? "CDB" : "Tipo"}
                  </th>
                  <th className="text-right p-2">Quantidade</th>
                  <th className="text-right p-2">Valor Investido</th>
                  <th className="text-right p-2">Valor Atual</th>
                  <th className="text-right p-2">Retorno</th>
                  <th className="text-right p-2">%</th>
                </tr>
              </thead>
              <tbody>
                {distributionDataWithPercentage.map((item, index) => {
                  if (isSingleType && assets.length > 1) {
                    // Se está mostrando por asset individual
                    const asset = assets.find(a => a.id === item.assetId);
                    if (!asset) return null;

                    const totalReturn = asset.current_value - asset.initial_investment;
                    const returnPercentage = asset.initial_investment > 0 ? (totalReturn / asset.initial_investment) * 100 : 0;

                    return (
                      <tr key={asset.id} className="border-b">
                        <td className="p-2">{asset.name}</td>
                        <td className="text-right p-2">1</td>
                        <td className="text-right p-2">{formatCurrency(asset.initial_investment)}</td>
                        <td className="text-right p-2">{formatCurrency(asset.current_value)}</td>
                        <td className={`text-right p-2 ${totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(totalReturn)}
                        </td>
                        <td className={`text-right p-2 ${returnPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {returnPercentage.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  } else {
                    // Se está mostrando por tipo
                    const typeAssets = assets.filter(a => getAssetTypeLabel(a.asset_type) === item.name);
                    const totalInvested = typeAssets.reduce((sum, a) => sum + a.initial_investment, 0);
                    const totalReturn = item.value - totalInvested;
                    const returnPercentage = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

                    return (
                      <tr key={item.name} className="border-b">
                        <td className="p-2">{item.name}</td>
                        <td className="text-right p-2">{typeAssets.length}</td>
                        <td className="text-right p-2">{formatCurrency(totalInvested)}</td>
                        <td className="text-right p-2">{formatCurrency(item.value)}</td>
                        <td className={`text-right p-2 ${totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(totalReturn)}
                        </td>
                        <td className={`text-right p-2 ${returnPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {returnPercentage.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  }
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};