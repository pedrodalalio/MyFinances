import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, ArrowDownLeft, Trash2, Edit } from "lucide-react";
import { api } from "@/utils/api";

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

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("pt-BR", { timeZone: "UTC" });
};

const incomeSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Valor deve ser um número positivo",
  }),
  source: z.string().optional(),
  category: z.string().optional(),
  date: z.string().min(1, "Data é obrigatória"),
});

type IncomeFormValues = z.infer<typeof incomeSchema>;

interface Income {
  id: string;
  name: string;
  description?: string;
  amount: string;
  source?: string;
  category?: string;
  month: string;
  year: number;
  date: string;
  created_at: string;
}

const IncomesPage = () => {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
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
    document.title = "Entradas | MyFinances";
    loadIncomes();
  }, [selectedPeriod]);

  const form = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      name: "",
      description: "",
      amount: "",
      source: "",
      category: "",
      date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0],
    },
  });

  const loadIncomes = async () => {
    try {
      const month = selectedMonth.toString().padStart(2, "0");
      const response = await api.get(`/incomes/${month}/${selectedYear}`);
      setIncomes(response.data.incomes || []);
    } catch (error) {
      console.error("Erro ao carregar entradas:", error);
    }
  };

  const onSubmit = async (values: IncomeFormValues) => {
    if (editingIncome) {
      await updateIncome(values);
    } else {
      await createIncome(values);
    }
  };

  const createIncome = async (values: IncomeFormValues) => {
    setLoading(true);
    try {
      const [yearStr, monthStr] = values.date.split("-");
      const requestBody = {
        name: values.name,
        description: values.description,
        amount: Math.round(parseFloat(values.amount) * 100) / 100,
        source: values.source,
        category: values.category,
        month: monthStr,
        year: parseInt(yearStr),
        date: values.date,
      };

      await api.post("/incomes", requestBody);
      setIsDialogOpen(false);
      form.reset();
      loadIncomes();
    } catch (error) {
      console.error("Erro ao criar entrada:", error);
    } finally {
      setLoading(false);
    }
  };

  const editIncome = (income: Income) => {
    setEditingIncome(income);
    form.reset({
      name: income.name,
      description: income.description || "",
      amount: parseFloat(income.amount).toFixed(2),
      source: income.source || "",
      category: income.category || "",
      date: income.date.split("T")[0],
    });
    setIsDialogOpen(true);
  };

  const updateIncome = async (values: IncomeFormValues) => {
    if (!editingIncome) return;

    setLoading(true);
    try {
      const [yearStr, monthStr] = values.date.split("-");
      const requestBody = {
        name: values.name,
        description: values.description,
        amount: Math.round(parseFloat(values.amount) * 100) / 100,
        source: values.source,
        category: values.category,
        month: monthStr,
        year: parseInt(yearStr),
        date: values.date,
      };

      await api.put(`/incomes/${editingIncome.id}`, requestBody);
      setIsDialogOpen(false);
      setEditingIncome(null);
      form.reset();
      loadIncomes();
    } catch (error) {
      console.error("Erro ao atualizar entrada:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteIncome = async (id: string) => {
    try {
      await api.delete(`/incomes/${id}`);
      loadIncomes();
    } catch (error) {
      console.error("Erro ao deletar entrada:", error);
    }
  };

  const totalIncomes = incomes.reduce(
    (sum, income) => sum + parseFloat(income.amount),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Entradas</h1>
          <p className="text-muted-foreground">
            Gerencie suas entradas extras (freelances, presentes, devoluções, etc.)
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Entrada
            </Button>
          </DialogTrigger>
          <DialogContent
            className="sm:max-w-[425px]"
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>
                {editingIncome ? "Editar Entrada" : "Adicionar Entrada"}
              </DialogTitle>
              <DialogDescription>
                {editingIncome
                  ? "Edite as informações da sua entrada."
                  : "Adicione uma nova entrada de dinheiro."}
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
                      <FormLabel>Nome da Entrada</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Freelance, Presente, Devolução..."
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
                          placeholder="Detalhes sobre a entrada..."
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
                    name="source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Origem (opcional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Pai, Cliente, Amigo..."
                            {...field}
                          />
                        </FormControl>
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
                          placeholder="Ex: Freelance, Presente, Devolução..."
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
                      setEditingIncome(null);
                      form.reset({
                        name: "",
                        description: "",
                        amount: "",
                        source: "",
                        category: "",
                        date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0],
                      });
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading
                      ? editingIncome
                        ? "Atualizando..."
                        : "Salvando..."
                      : editingIncome
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

      {/* Total de entradas do mês */}
      {incomes.length > 0 && (
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <ArrowDownLeft className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Total de entradas no mês</span>
            </div>
            <span className="text-2xl font-bold text-green-500">
              R$ {formatCurrency(totalIncomes)}
            </span>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {incomes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ArrowDownLeft className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Nenhuma entrada cadastrada
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                Comece adicionando suas entradas extras para acompanhar suas
                finanças.
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Primeira Entrada
              </Button>
            </CardContent>
          </Card>
        ) : (
          incomes.map((income) => (
            <Card key={income.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowDownLeft className="h-5 w-5 text-green-500" />
                      {income.name}
                    </CardTitle>
                    {income.description && (
                      <CardDescription>{income.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => editIncome(income)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteIncome(income.id)}
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
                    <p className="font-semibold text-green-500">
                      R$ {formatCurrency(parseFloat(income.amount))}
                    </p>
                  </div>
                  {income.source && (
                    <div>
                      <p className="text-muted-foreground">Origem</p>
                      <p className="font-semibold">{income.source}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Data</p>
                    <p className="font-semibold">{formatDate(income.date)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Período</p>
                    <p className="font-semibold">
                      {income.month}/{income.year}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  {income.category && (
                    <Badge variant="secondary">{income.category}</Badge>
                  )}
                  {income.source && (
                    <Badge variant="outline">{income.source}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default IncomesPage;
