import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Wallet, Trash2, Edit } from "lucide-react";
import { api } from "@/utils/api";
import { refreshBalanceSummary } from "@/components/BalanceSummary";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

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


const paymentMethods = [
  { value: "PIX", label: "PIX" },
  { value: "CASH", label: "Dinheiro" },
  { value: "DEBIT_CARD", label: "Cartão de Débito" },
  { value: "BANK_TRANSFER", label: "Transferência Bancária" },
  { value: "OTHER", label: "Outro" },
];

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("pt-BR", { timeZone: "UTC" });
};

const expenseSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Valor deve ser um número positivo",
  }),
  payment_method: z.string().min(1, "Método de pagamento é obrigatório"),
  category: z.string().optional(),
  date: z.string().min(1, "Data é obrigatória"),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface Expense {
  id: string;
  name: string;
  description?: string;
  amount: string;
  payment_method: string;
  category?: string;
  month: string;
  year: number;
  date: string;
  created_at: string;
}

const ExpensesPage = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}`;
  });

  const selectedMonth = parseInt(selectedPeriod.split("-")[1]);
  const selectedYear = parseInt(selectedPeriod.split("-")[0]);

  const periodMonths = (() => {
    const result: { month: string; year: number; key: string }[] = [];
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth() - 11);
    const end = new Date(today.getFullYear(), today.getMonth() + 3);
    let current = new Date(start);
    while (current <= end) {
      const m = (current.getMonth() + 1).toString().padStart(2, "0");
      const y = current.getFullYear();
      result.push({ month: m, year: y, key: `${y}-${m}` });
      current.setMonth(current.getMonth() + 1);
    }
    return result;
  })();

  useEffect(() => {
    document.title = "Gastos | MyFinances";
    loadExpenses();
  }, [selectedPeriod]);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      name: "",
      description: "",
      amount: "",
      payment_method: "PIX",
      category: "",
      date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0],
    },
  });

  const loadExpenses = async () => {
    try {
      const month = selectedMonth.toString().padStart(2, "0");
      const response = await api.get(`/expenses/${month}/${selectedYear}`);
      setExpenses(response.data.expenses || []);
    } catch (error) {
      console.error("Erro ao carregar gastos:", error);
    }
  };

  const onSubmit = async (values: ExpenseFormValues) => {
    if (editingExpense) {
      await updateExpense(values);
    } else {
      await createExpense(values);
    }
  };

  const createExpense = async (values: ExpenseFormValues) => {
    setLoading(true);
    try {
      const [yearStr, monthStr] = values.date.split("-");
      const requestBody = {
        name: values.name,
        description: values.description,
        amount: Math.round(parseFloat(values.amount) * 100) / 100,
        payment_method: values.payment_method,
        category: values.category,
        month: monthStr,
        year: parseInt(yearStr),
        date: values.date,
      };

      await api.post("/expenses", requestBody);
      setIsDialogOpen(false);
      form.reset();
      loadExpenses();
      refreshBalanceSummary();
    } catch (error) {
      console.error("Erro ao criar gasto:", error);
    } finally {
      setLoading(false);
    }
  };

  const editExpense = (expense: Expense) => {
    setEditingExpense(expense);
    form.reset({
      name: expense.name,
      description: expense.description || "",
      amount: parseFloat(expense.amount).toFixed(2),
      payment_method: expense.payment_method,
      category: expense.category || "",
      date: expense.date.split("T")[0],
    });
    setIsDialogOpen(true);
  };

  const updateExpense = async (values: ExpenseFormValues) => {
    if (!editingExpense) return;

    setLoading(true);
    try {
      const [yearStr, monthStr] = values.date.split("-");
      const requestBody = {
        name: values.name,
        description: values.description,
        amount: Math.round(parseFloat(values.amount) * 100) / 100,
        payment_method: values.payment_method,
        category: values.category,
        month: monthStr,
        year: parseInt(yearStr),
        date: values.date,
      };

      await api.put(`/expenses/${editingExpense.id}`, requestBody);
      setIsDialogOpen(false);
      setEditingExpense(null);
      form.reset();
      loadExpenses();
      refreshBalanceSummary();
    } catch (error) {
      console.error("Erro ao atualizar gasto:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      await api.delete(`/expenses/${id}`);
      loadExpenses();
      refreshBalanceSummary();
    } catch (error) {
      console.error("Erro ao deletar gasto:", error);
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const paymentMethod = paymentMethods.find((p) => p.value === method);
    return paymentMethod ? paymentMethod.label : method;
  };

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + parseFloat(expense.amount),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gastos</h1>
          <p className="text-muted-foreground">
            Gerencie seus gastos simples (PIX, dinheiro, etc.)
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Gasto
            </Button>
          </DialogTrigger>
          <DialogContent
            className="sm:max-w-[425px]"
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>
                {editingExpense ? "Editar Gasto" : "Adicionar Gasto"}
              </DialogTitle>
              <DialogDescription>
                {editingExpense
                  ? "Edite as informações do seu gasto."
                  : "Adicione um novo gasto simples."}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Gasto</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Almoço, Transporte..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição (opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Detalhes sobre o gasto..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor</FormLabel>
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

                  <FormField
                    control={form.control}
                    name="payment_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Forma de Pagamento</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {paymentMethods.map((method) => (
                              <SelectItem
                                key={method.value}
                                value={method.value}
                              >
                                {method.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Alimentação, Transporte..."
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
                      setIsDialogOpen(false);
                      setEditingExpense(null);
                      form.reset({
                        name: "",
                        description: "",
                        amount: "",
                        payment_method: "PIX",
                        category: "",
                        date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0],
                      });
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading
                      ? editingExpense
                        ? "Atualizando..."
                        : "Salvando..."
                      : editingExpense
                        ? "Atualizar"
                        : "Salvar"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Carrossel de meses */}
      <div className="border-b">
        <div className="overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {periodMonths.map((period) => {
              const monthName = months.find(m => m.value === period.month)?.label || period.month;
              const isActive = selectedPeriod === period.key;

              return (
                <Button
                  key={period.key}
                  variant={isActive ? "default" : "ghost"}
                  className={`whitespace-nowrap px-6 py-2 rounded-none border-b-2 ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-transparent hover:border-muted-foreground/30"
                  }`}
                  onClick={() => setSelectedPeriod(period.key)}
                >
                  <span className="font-medium">
                    {monthName}/{period.year.toString().slice(-2)}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Total de gastos do mês */}
      {expenses.length > 0 && (
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Total de gastos no mês</span>
            </div>
            <span className="text-2xl font-bold text-red-500">
              R$ {formatCurrency(totalExpenses)}
            </span>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {expenses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Nenhum gasto cadastrado
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                Comece adicionando seus gastos simples para acompanhar suas
                finanças.
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Primeiro Gasto
              </Button>
            </CardContent>
          </Card>
        ) : (
          expenses.map((expense) => (
            <Card key={expense.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="h-5 w-5" />
                      {expense.name}
                    </CardTitle>
                    {expense.description && (
                      <CardDescription>{expense.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => editExpense(expense)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteExpense(expense.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Valor</p>
                    <p className="font-semibold">
                      R$ {formatCurrency(parseFloat(expense.amount))}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Forma de Pagamento</p>
                    <p className="font-semibold">
                      {getPaymentMethodLabel(expense.payment_method)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Data</p>
                    <p className="font-semibold">{formatDate(expense.date)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Período</p>
                    <p className="font-semibold">
                      {expense.month}/{expense.year}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  {expense.category && (
                    <Badge variant="secondary">{expense.category}</Badge>
                  )}
                  <Badge variant="outline">
                    {getPaymentMethodLabel(expense.payment_method)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ExpensesPage;
