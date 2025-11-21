import React, { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  CreditCard,
  Repeat,
  Edit,
  Receipt,
  TrendingUp,
} from "lucide-react";
import { api } from "@/utils/api";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { FinancialOverview } from "@/components/FinancialOverview";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const months = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const formatCurrency = (value: number): string => {
  return (Math.round(value * 100) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const getPaymentMethodLabel = (method: string): string => {
  const labels: Record<string, string> = {
    PIX: "PIX",
    CASH: "Dinheiro",
    DEBIT_CARD: "Cartão de Débito",
    BANK_TRANSFER: "Transferência",
    OTHER: "Outros",
  };
  return labels[method] || method;
};

const getInvestmentTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    STOCKS: "Ações",
    FUNDS: "Fundos",
    CRYPTO: "Crypto",
    SAVINGS: "Poupança",
    CDB: "CDB",
    LCI_LCA: "LCI/LCA",
    DEBENTURES: "Debêntures",
    TREASURY: "Tesouro",
    OTHER: "Outros",
  };
  return labels[type] || type;
};

interface MonthlyExpense {
  id: string;
  name: string;
  amount: number;
  type: "installment" | "recurring";
  current_installment?: number;
  total_installments?: number;
  purchase_id?: string;
}

const editInstallmentSchema = z.object({
  installment_amount: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Valor deve ser um número positivo",
    }),
});

type EditInstallmentFormValues = z.infer<typeof editInstallmentSchema>;

interface MonthlyExpensesData {
  expenses: MonthlyExpense[];
  total: number;
  month: string;
  year: number;
}

interface CashExpense {
  id: string;
  name: string;
  description?: string;
  amount: number;
  payment_method: string;
  category?: string;
  date: string;
}

interface CashExpensesData {
  expenses: CashExpense[];
  total: number;
  month: string;
  year: number;
}

interface Investment {
  id: string;
  name: string;
  description?: string;
  amount: number;
  investment_type: string;
  category?: string;
  expected_return?: number;
  date: string;
}

interface InvestmentsData {
  investments: Investment[];
  total: number;
  month: string;
  year: number;
}

const MonthlyTrackingPage = () => {
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return {
      month: (now.getMonth() + 1).toString().padStart(2, "0"),
      year: now.getFullYear(),
    };
  });

  const [expensesData, setExpensesData] = useState<MonthlyExpensesData | null>(
    null,
  );
  const [cashExpensesData, setCashExpensesData] =
    useState<CashExpensesData | null>(null);
  const [investmentsData, setInvestmentsData] =
    useState<InvestmentsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCashExpenses, setLoadingCashExpenses] = useState(false);
  const [loadingInvestments, setLoadingInvestments] = useState(false);
  const [editingInstallment, setEditingInstallment] =
    useState<MonthlyExpense | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [overviewKey, setOverviewKey] = useState(0); // Para forçar re-render do FinancialOverview

  const editForm = useForm<EditInstallmentFormValues>({
    resolver: zodResolver(editInstallmentSchema),
    defaultValues: {
      installment_amount: "",
    },
  });

  useEffect(() => {
    document.title = "Acompanhamento Mensal | MyFinances";
    loadMonthlyExpenses();
    loadCashExpenses();
    loadInvestments();
  }, [currentDate]);

  const loadMonthlyExpenses = async () => {
    setLoading(true);
    try {
      const response = await api.get(
        `/credit-cards/monthly-expenses?month=${currentDate.month}&year=${currentDate.year}`,
      );
      setExpensesData(response.data);
    } catch (error) {
      console.error("Erro ao carregar gastos mensais:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCashExpenses = async () => {
    setLoadingCashExpenses(true);
    try {
      const response = await api.get(
        `/expenses/${currentDate.month}/${currentDate.year}`,
      );
      const data = response.data;
      const total = data.expenses.reduce(
        (sum: number, expense: CashExpense) => sum + Number(expense.amount),
        0,
      );
      setCashExpensesData({
        expenses: data.expenses,
        total,
        month: currentDate.month,
        year: currentDate.year,
      });
    } catch (error) {
      console.error("Erro ao carregar gastos à vista:", error);
    } finally {
      setLoadingCashExpenses(false);
    }
  };

  const loadInvestments = async () => {
    setLoadingInvestments(true);
    try {
      const response = await api.get(
        `/monthly-investments/${currentDate.month}/${currentDate.year}`,
      );
      const data = response.data;
      const total = data.investments.reduce(
        (sum: number, investment: Investment) =>
          sum + Number(investment.amount),
        0,
      );
      setInvestmentsData({
        investments: data.investments,
        total,
        month: currentDate.month,
        year: currentDate.year,
      });
    } catch (error) {
      console.error("Erro ao carregar investimentos:", error);
    } finally {
      setLoadingInvestments(false);
    }
  };

  const navigateMonth = (direction: "prev" | "next") => {
    const currentMonth = parseInt(currentDate.month);
    const currentYear = currentDate.year;

    if (direction === "prev") {
      if (currentMonth === 1) {
        setCurrentDate({
          month: "12",
          year: currentYear - 1,
        });
      } else {
        setCurrentDate({
          month: (currentMonth - 1).toString().padStart(2, "0"),
          year: currentYear,
        });
      }
    } else {
      if (currentMonth === 12) {
        setCurrentDate({
          month: "01",
          year: currentYear + 1,
        });
      } else {
        setCurrentDate({
          month: (currentMonth + 1).toString().padStart(2, "0"),
          year: currentYear,
        });
      }
    }
  };

  const currentMonthLabel =
    months.find((m) => m.value === currentDate.month)?.label || "";

  const openEditInstallment = (expense: MonthlyExpense) => {
    if (expense.type === "installment") {
      setEditingInstallment(expense);
      editForm.reset({
        installment_amount: expense.amount.toFixed(2),
      });
      setIsEditDialogOpen(true);
    }
  };

  const onSubmitEdit = async (values: EditInstallmentFormValues) => {
    if (!editingInstallment) return;

    try {
      await api.put(`/credit-cards/installments/${editingInstallment.id}`, {
        installment_amount: parseFloat(values.installment_amount),
      });

      // Atualizar o valor localmente sem recarregar tudo
      if (expensesData) {
        const updatedExpenses = expensesData.expenses.map((expense) =>
          expense.id === editingInstallment.id
            ? { ...expense, amount: parseFloat(values.installment_amount) }
            : expense,
        );

        const newTotal = updatedExpenses.reduce(
          (sum, expense) => sum + expense.amount,
          0,
        );

        setExpensesData({
          ...expensesData,
          expenses: updatedExpenses,
          total: newTotal,
        });
      }

      setIsEditDialogOpen(false);
      setEditingInstallment(null);
      editForm.reset();
      setOverviewKey((prev) => prev + 1); // Força o FinancialOverview a recarregar
    } catch (error) {
      console.error("Erro ao atualizar parcela:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Acompanhamento Mensal</h1>
          <p className="text-muted-foreground">
            Visualize seus gastos de cartão, à vista e investimentos por mês
          </p>
        </div>

        {/* Seletor de Mês/Ano */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateMonth("prev")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-lg font-semibold min-w-[200px] text-center">
            {currentMonthLabel} {currentDate.year}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateMonth("next")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Overview Financeiro */}
      <FinancialOverview
        key={overviewKey}
        month={currentDate.month}
        year={currentDate.year}
      />

      {/* Gastos do Cartão de Crédito */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              <CardTitle>Gastos do Cartão de Crédito</CardTitle>
            </div>
            {expensesData && (
              <div className="text-lg font-semibold text-red-600">
                R$ {formatCurrency(expensesData.total)}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {expensesData && (
            <div className="space-y-4">
              {/* Resumo dos gastos */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span className="font-medium">Parcelas</span>
                  </div>
                  <span className="font-semibold">
                    {
                      expensesData.expenses.filter(
                        (e) => e.type === "installment",
                      ).length
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Repeat className="h-4 w-4" />
                    <span className="font-medium">Recorrentes</span>
                  </div>
                  <span className="font-semibold">
                    {
                      expensesData.expenses.filter(
                        (e) => e.type === "recurring",
                      ).length
                    }
                  </span>
                </div>
              </div>

              {/* Lista de gastos */}
              <div className="space-y-3">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <p>Carregando gastos...</p>
                  </div>
                ) : expensesData.expenses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      Nenhum gasto encontrado
                    </h3>
                    <p className="text-muted-foreground text-center">
                      Não há gastos de cartão de crédito para{" "}
                      {currentMonthLabel} de {currentDate.year}.
                    </p>
                  </div>
                ) : (
                  expensesData.expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {expense.type === "recurring" ? (
                            <Repeat className="h-4 w-4 text-blue-600" />
                          ) : (
                            <CreditCard className="h-4 w-4 text-gray-600" />
                          )}
                          <span className="font-medium">{expense.name}</span>
                        </div>
                        <div>
                          {expense.type === "recurring" ? (
                            <Badge variant="default" className="text-xs">
                              Recorrente
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              {expense.current_installment}/
                              {expense.total_installments}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="font-semibold">
                          R$ {formatCurrency(expense.amount)}
                        </div>
                        {expense.type === "installment" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditInstallment(expense)}
                            className="h-8 w-8 text-blue-500 hover:text-blue-700"
                            title="Editar valor desta parcela"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gastos à Vista */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              <CardTitle>Gastos à Vista</CardTitle>
            </div>
            {cashExpensesData && (
              <div className="text-lg font-semibold text-red-600">
                R$ {formatCurrency(cashExpensesData.total)}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {cashExpensesData && (
            <div className="space-y-4">
              {/* Resumo dos gastos */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    <span className="font-medium">Total de Gastos</span>
                  </div>
                  <span className="font-semibold">
                    {cashExpensesData.expenses.length}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">PIX</span>
                  </div>
                  <span className="font-semibold">
                    {
                      cashExpensesData.expenses.filter(
                        (e) => e.payment_method === "PIX",
                      ).length
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Outros</span>
                  </div>
                  <span className="font-semibold">
                    {
                      cashExpensesData.expenses.filter(
                        (e) => e.payment_method !== "PIX",
                      ).length
                    }
                  </span>
                </div>
              </div>

              {/* Lista de gastos */}
              <div className="space-y-3">
                {loadingCashExpenses ? (
                  <div className="flex items-center justify-center py-8">
                    <p>Carregando gastos...</p>
                  </div>
                ) : cashExpensesData.expenses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      Nenhum gasto encontrado
                    </h3>
                    <p className="text-muted-foreground text-center">
                      Não há gastos à vista para {currentMonthLabel} de{" "}
                      {currentDate.year}.
                    </p>
                  </div>
                ) : (
                  cashExpensesData.expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-green-600" />
                          <div>
                            <span className="font-medium">{expense.name}</span>
                            {expense.description && (
                              <p className="text-xs text-muted-foreground">
                                {expense.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div>
                          <Badge variant="outline" className="text-xs">
                            {getPaymentMethodLabel(expense.payment_method)}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="font-semibold">
                          R$ {formatCurrency(Number(expense.amount))}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(expense.date).toLocaleDateString("pt-BR")}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Investimentos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              <CardTitle>Investimentos</CardTitle>
            </div>
            {investmentsData && (
              <div className="text-lg font-semibold text-green-600">
                {formatCurrency(investmentsData.total)}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {investmentsData && (
            <div className="space-y-4">
              {/* Resumo dos investimentos */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <span className="font-medium">Total de Investimentos</span>
                  </div>
                  <span className="font-semibold">
                    {investmentsData.investments.length}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Ações</span>
                  </div>
                  <span className="font-semibold">
                    {
                      investmentsData.investments.filter(
                        (i) => i.investment_type === "STOCKS",
                      ).length
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Outros</span>
                  </div>
                  <span className="font-semibold">
                    {
                      investmentsData.investments.filter(
                        (i) => i.investment_type !== "STOCKS",
                      ).length
                    }
                  </span>
                </div>
              </div>

              {/* Lista de investimentos */}
              <div className="space-y-3">
                {loadingInvestments ? (
                  <div className="flex items-center justify-center py-8">
                    <p>Carregando investimentos...</p>
                  </div>
                ) : investmentsData.investments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      Nenhum investimento encontrado
                    </h3>
                    <p className="text-muted-foreground text-center">
                      Não há investimentos para {currentMonthLabel} de{" "}
                      {currentDate.year}.
                    </p>
                  </div>
                ) : (
                  investmentsData.investments.map((investment) => (
                    <div
                      key={investment.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <div>
                            <span className="font-medium">
                              {investment.name}
                            </span>
                            {investment.description && (
                              <p className="text-xs text-muted-foreground">
                                {investment.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-xs">
                            {getInvestmentTypeLabel(investment.investment_type)}
                          </Badge>
                          {investment.category && (
                            <Badge variant="secondary" className="text-xs">
                              {investment.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="font-semibold text-green-600">
                            {formatCurrency(Number(investment.amount))}
                          </div>
                          {investment.expected_return && (
                            <div className="text-xs text-muted-foreground">
                              {investment.expected_return}% a.a.
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(investment.date).toLocaleDateString(
                            "pt-BR",
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Edição de Parcela */}
      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setEditingInstallment(null);
            editForm.reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Valor da Parcela</DialogTitle>
            <DialogDescription>
              Ajuste o valor desta parcela específica. Esta edição não afetará
              as outras parcelas.
            </DialogDescription>
          </DialogHeader>

          {editingInstallment && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-4 w-4" />
                  <span className="font-medium">{editingInstallment.name}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Parcela {editingInstallment.current_installment} de{" "}
                  {editingInstallment.total_installments}
                </div>
                <div className="text-sm text-muted-foreground">
                  Valor atual: R$ {formatCurrency(editingInstallment.amount)}
                </div>
              </div>

              <Form {...editForm}>
                <form
                  onSubmit={editForm.handleSubmit(onSubmitEdit)}
                  className="space-y-4"
                >
                  <FormField
                    control={editForm.control}
                    name="installment_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Novo Valor da Parcela</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0,00"
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
                        setIsEditDialogOpen(false);
                        setEditingInstallment(null);
                        editForm.reset();
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit">Salvar</Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MonthlyTrackingPage;
