import React, { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  AlertTriangle,
  CheckCircle,
  Plus,
  Edit3,
  Trash2,
} from "lucide-react";
import { api } from "@/utils/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ExpenseDonutChart } from "@/components/ExpenseDonutChart";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface FinancialOverviewData {
  financial_data: {
    main_income: number;
    checking_account: number;
    previous_balance: number;
    total_income: number;
    total_expenses: number;
    final_balance: number;
    expense_subtotal: number;
    income_subtotal: number;
    investment_subtotal: number;
    credit_card_subtotal: number;
    tax_subtotal: number;
    is_confirmed: boolean;
  };
  salary: {
    amount: number;
    description: string | null;
  } | null;
  analysis: {
    expense_percentage: number;
    reserve_percentage: number;
    reserve_amount: number;
    available_amount: number;
    is_over_budget: boolean;
    monthly_surplus_deficit: number;
  };
}

interface FinancialOverviewProps {
  month: string;
  year: number;
}

const formatCurrency = (value: number): string => {
  return (Math.round(value * 100) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

const addMoneySchema = z.object({
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Valor deve ser um número positivo",
  }),
});

type AddMoneyFormValues = z.infer<typeof addMoneySchema>;

export const FinancialOverview: React.FC<FinancialOverviewProps> = ({
  month,
  year,
}) => {
  const [overview, setOverview] = useState<FinancialOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddMoneyDialogOpen, setIsAddMoneyDialogOpen] = useState(false);
  const [isEditMoneyDialogOpen, setIsEditMoneyDialogOpen] = useState(false);

  const addMoneyForm = useForm<AddMoneyFormValues>({
    resolver: zodResolver(addMoneySchema),
    defaultValues: {
      amount: "",
    },
  });

  const editMoneyForm = useForm<AddMoneyFormValues>({
    resolver: zodResolver(addMoneySchema),
    defaultValues: {
      amount: "",
    },
  });

  useEffect(() => {
    refreshOverview();
  }, [month, year]);

  const refreshOverview = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/financial-overview/${month}/${year}`);
      setOverview(response.data.overview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  const onSubmitAddMoney = async (values: AddMoneyFormValues) => {
    try {
      await api.put(`/financial-data/${month}/${year}`, {
        checking_account: parseFloat(values.amount),
      });

      setIsAddMoneyDialogOpen(false);
      addMoneyForm.reset();
      await refreshOverview();
    } catch (error) {
      console.error("Erro ao adicionar dinheiro:", error);
    }
  };

  const onSubmitEditMoney = async (values: AddMoneyFormValues) => {
    try {
      await api.put(`/financial-data/${month}/${year}`, {
        checking_account: parseFloat(values.amount),
      });

      setIsEditMoneyDialogOpen(false);
      editMoneyForm.reset();
      await refreshOverview();
    } catch (error) {
      console.error("Erro ao editar dinheiro:", error);
    }
  };

  const onRemoveMoney = async () => {
    try {
      await api.put(`/financial-data/${month}/${year}`, {
        checking_account: 0,
      });

      await refreshOverview();
    } catch (error) {
      console.error("Erro ao remover dinheiro:", error);
    }
  };

  const handleEditMoney = () => {
    if (overview?.financial_data.checking_account) {
      editMoneyForm.setValue(
        "amount",
        overview.financial_data.checking_account.toString(),
      );
      setIsEditMoneyDialogOpen(true);
    }
  };

  const handleConfirmMonth = async () => {
    try {
      await api.post(`/financial-data/confirm-month/${month}/${year}`);
      await refreshOverview();
    } catch (error) {
      console.error("Erro ao confirmar mês:", error);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !overview) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            {error || "Dados não encontrados"}
          </div>
        </CardContent>
      </Card>
    );
  }

  const { financial_data, salary, analysis } = overview;

  const calculatedTotalIncome =
    financial_data.main_income +
    financial_data.checking_account +
    financial_data.previous_balance +
    financial_data.income_subtotal;

  // Usar salário se disponível, senão usar dados do financial_data
  const displayTotalIncome = salary?.amount
    ? salary.amount +
      financial_data.checking_account +
      financial_data.previous_balance +
      financial_data.income_subtotal
    : financial_data.total_income > 0
      ? financial_data.total_income
      : calculatedTotalIncome;

  const referenceIncome = displayTotalIncome;

  return (
    <div className="space-y-6">
      {/* Resumo Principal */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(displayTotalIncome)}
            </div>
            <div className="text-xs text-muted-foreground mt-1 space-y-1">
              <div>
                Salário:{" "}
                {formatCurrency(salary?.amount || financial_data.main_income)}
              </div>
              {financial_data.previous_balance > 0 && (
                <div>
                  Saldo anterior:{" "}
                  {formatCurrency(financial_data.previous_balance)}
                </div>
              )}
              {financial_data.income_subtotal > 0 && (
                <div>
                  Entradas extras:{" "}
                  {formatCurrency(financial_data.income_subtotal)}
                </div>
              )}
              {financial_data.checking_account > 0 && (
                <div className="flex items-center justify-between">
                  <span>
                    Conta corrente:{" "}
                    {formatCurrency(financial_data.checking_account)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleEditMoney}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      title="Editar valor"
                    >
                      <Edit3 className="h-3 w-3 text-gray-500" />
                    </button>
                    <button
                      onClick={onRemoveMoney}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      title="Remover valor"
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </button>
                  </div>
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddMoneyDialogOpen(true)}
              className="mt-3 w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar à Conta Corrente
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Totais</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(financial_data.total_expenses)}
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-xs text-muted-foreground">
                {formatPercentage(analysis.expense_percentage)} da receita
              </span>
              {analysis.is_over_budget && (
                <Badge variant="destructive" className="text-xs">
                  Acima do orçamento
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Saldo Disponível
            </CardTitle>
            {analysis.monthly_surplus_deficit >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                analysis.monthly_surplus_deficit >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {formatCurrency(analysis.available_amount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analysis.monthly_surplus_deficit >= 0 ? "Superávit" : "Déficit"}{" "}
              de {formatCurrency(Math.abs(analysis.monthly_surplus_deficit))}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Taxa de Reserva
            </CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className={`text-2xl font-bold ${
              analysis.reserve_percentage >= 20
                ? "text-green-600"
                : analysis.reserve_percentage >= 10
                  ? "text-yellow-600"
                  : "text-red-600"
            }`}>
              {formatPercentage(analysis.reserve_percentage)}
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reserva disponível:</span>
                <span className="font-medium">
                  {formatCurrency(analysis.reserve_amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Receita total:</span>
                <span className="font-medium">
                  {formatCurrency(displayTotalIncome)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Investido:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(financial_data.investment_subtotal)}
                </span>
              </div>
            </div>

            <div className={`text-xs p-2 rounded-md ${
              analysis.reserve_percentage >= 30
                ? "bg-green-50 text-green-700"
                : analysis.reserve_percentage >= 15
                  ? "bg-yellow-50 text-yellow-700"
                  : "bg-red-50 text-red-700"
            }`}>
              {analysis.reserve_percentage >= 30
                ? "🏆 Excelente! Ótima reserva de emergência"
                : analysis.reserve_percentage >= 15
                  ? "✓ Boa reserva. Continue assim!"
                  : analysis.reserve_percentage > 0
                    ? "📈 Reserva baixa. Tente reduzir gastos essenciais"
                    : "🚨 Gastos essenciais excedem a receita"
              }
            </div>

            <div className="text-xs text-muted-foreground pt-1 border-t">
              Calculado: {formatCurrency(analysis.reserve_amount)} ÷ {formatCurrency(displayTotalIncome)} × 100
              <br />
              <span className="text-green-600">* Investimentos não são considerados gastos</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detalhamento dos Gastos */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribuição de Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            <ExpenseDonutChart
              data={[
                {
                  name: "Despesas Gerais",
                  value: financial_data.expense_subtotal,
                  color: "#8B5CF6"
                },
                {
                  name: "Cartão de Crédito",
                  value: financial_data.credit_card_subtotal,
                  color: "#EF4444"
                },
                {
                  name: "Impostos",
                  value: financial_data.tax_subtotal,
                  color: "#F59E0B"
                }
              ]}
            />

            {/* Legenda */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {(() => {
                const totalExpenses = financial_data.expense_subtotal + financial_data.credit_card_subtotal + financial_data.tax_subtotal;
                const expensePercent = totalExpenses > 0 ? (financial_data.expense_subtotal / totalExpenses * 100).toFixed(1) : 0;
                const creditPercent = totalExpenses > 0 ? (financial_data.credit_card_subtotal / totalExpenses * 100).toFixed(1) : 0;
                const taxPercent = totalExpenses > 0 ? (financial_data.tax_subtotal / totalExpenses * 100).toFixed(1) : 0;

                return (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        <span>Despesas Gerais</span>
                      </div>
                      <span className="font-medium">{expensePercent}%</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span>Cartão de Crédito</span>
                      </div>
                      <span className="font-medium">{creditPercent}%</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <span>Impostos</span>
                      </div>
                      <span className="font-medium">{taxPercent}%</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Análise Financeira</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              {analysis.is_over_budget ? (
                <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              )}
              <div>
                <p className="font-medium">
                  {analysis.is_over_budget
                    ? "Atenção: Gastos acima da receita"
                    : "Gastos dentro do orçamento"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {analysis.is_over_budget
                    ? "Considere revisar seus gastos para o próximo mês"
                    : "Você está mantendo um bom controle financeiro"}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Resumo do Mês</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Receita:</span>
                  <span className="font-medium">
                    {formatCurrency(referenceIncome)}
                  </span>
                </div>
                {financial_data.income_subtotal > 0 && (
                  <div className="flex justify-between">
                    <span>Entradas extras:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(financial_data.income_subtotal)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Gastos:</span>
                  <span className="font-medium">
                    {formatCurrency(financial_data.total_expenses)}
                  </span>
                </div>
                {financial_data.investment_subtotal > 0 && (
                  <div className="flex justify-between">
                    <span>Investimentos:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(financial_data.investment_subtotal)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2">
                  <span>Resultado:</span>
                  <span
                    className={`font-bold ${
                      analysis.monthly_surplus_deficit >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(analysis.monthly_surplus_deficit)}
                  </span>
                </div>
              </div>
            </div>

            {/* Botão Confirmar Mês */}
            <div className="pt-4 border-t">
              <div className="flex flex-col gap-2">
                <h4 className="font-medium">Fechar Mês</h4>
                <p className="text-sm text-muted-foreground">
                  Confirme o fechamento do mês para transferir o saldo para o próximo período
                </p>
                {financial_data.is_confirmed ? (
                  <div className="text-center p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-1" />
                    <p className="text-sm font-medium text-green-800">Mês já confirmado</p>
                    <p className="text-xs text-green-600">
                      Saldo transferido para o próximo mês
                    </p>
                  </div>
                ) : (
                  <Button
                    onClick={handleConfirmMonth}
                    className={`w-full ${
                      analysis.monthly_surplus_deficit >= 0
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-orange-600 hover:bg-orange-700"
                    }`}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {analysis.monthly_surplus_deficit >= 0
                      ? `Confirmar e Transferir ${formatCurrency(analysis.monthly_surplus_deficit)}`
                      : `Confirmar Déficit de ${formatCurrency(Math.abs(analysis.monthly_surplus_deficit))}`
                    }
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal para Adicionar Dinheiro */}
      <Dialog
        open={isAddMoneyDialogOpen}
        onOpenChange={(open) => {
          setIsAddMoneyDialogOpen(open);
          if (!open) {
            addMoneyForm.reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adicionar Dinheiro Extra</DialogTitle>
            <DialogDescription>
              Adicione dinheiro extra para este mês específico (ex: dinheiro que
              já estava na conta, bônus, etc.)
            </DialogDescription>
          </DialogHeader>

          <Form {...addMoneyForm}>
            <form
              onSubmit={addMoneyForm.handleSubmit(onSubmitAddMoney)}
              className="space-y-4"
            >
              <FormField
                control={addMoneyForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Extra</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Ex: 180,00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddMoneyDialogOpen(false);
                    addMoneyForm.reset();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">Adicionar</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal para Editar Dinheiro */}
      <Dialog
        open={isEditMoneyDialogOpen}
        onOpenChange={(open) => {
          setIsEditMoneyDialogOpen(open);
          if (!open) {
            editMoneyForm.reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Conta Corrente</DialogTitle>
            <DialogDescription>
              Altere o valor da conta corrente para este mês específico
            </DialogDescription>
          </DialogHeader>

          <Form {...editMoneyForm}>
            <form
              onSubmit={editMoneyForm.handleSubmit(onSubmitEditMoney)}
              className="space-y-4"
            >
              <FormField
                control={editMoneyForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Novo Valor</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Ex: 180,00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditMoneyDialogOpen(false);
                    editMoneyForm.reset();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
