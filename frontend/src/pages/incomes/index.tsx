import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, ArrowDownLeft, Trash2, Edit } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/utils/api";
import { queryKeys, invalidateFinancialData } from "@/lib/query";
import QueryError from "@/components/QueryError";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
  }, []);

  const queryClient = useQueryClient();
  const monthKey = selectedMonth.toString().padStart(2, "0");

  const {
    data: incomes = [],
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.incomes(monthKey, selectedYear),
    queryFn: async () => {
      const response = await api.get(`/incomes/${monthKey}/${selectedYear}`);
      return (response.data.incomes || []) as Income[];
    },
  });

  // Entradas mexem no saldo: invalida as keys do recurso e os dados financeiros globais
  const invalidateIncomes = () => {
    queryClient.invalidateQueries({ queryKey: ["incomes"] });
    invalidateFinancialData();
  };

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

  const buildRequestBody = (values: IncomeFormValues) => {
    const [yearStr, monthStr] = values.date.split("-");
    return {
      name: values.name,
      description: values.description,
      amount: Math.round(parseFloat(values.amount) * 100) / 100,
      source: values.source,
      category: values.category,
      month: monthStr,
      year: parseInt(yearStr),
      date: values.date,
    };
  };

  const createMutation = useMutation({
    mutationFn: (values: IncomeFormValues) =>
      api.post("/incomes", buildRequestBody(values)),
    onSuccess: () => {
      setIsDialogOpen(false);
      form.reset();
      invalidateIncomes();
    },
    onError: () => {
      toast.error("Erro ao criar entrada.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: IncomeFormValues }) =>
      api.put(`/incomes/${id}`, buildRequestBody(values)),
    onSuccess: () => {
      setIsDialogOpen(false);
      setEditingIncome(null);
      form.reset();
      invalidateIncomes();
    },
    onError: () => {
      toast.error("Erro ao atualizar entrada.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/incomes/${id}`),
    onSuccess: () => {
      invalidateIncomes();
    },
    onError: () => {
      toast.error("Erro ao deletar entrada.");
    },
  });

  const loading = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: IncomeFormValues) => {
    if (editingIncome) {
      updateMutation.mutate({ id: editingIncome.id, values });
    } else {
      createMutation.mutate(values);
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

  const deleteIncome = (id: string) => {
    deleteMutation.mutate(id);
  };

  const totalIncomes = incomes.reduce(
    (sum, income) => sum + parseFloat(income.amount),
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Entradas"
        title="Receitas extras"
        description="Registre freelances, presentes, devoluções e outras entradas além do salário."
        action={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova entrada
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
        }
      />

      {/* Carrossel de meses */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card/40 p-1">
        <div className="flex gap-1 min-w-max">
          {periodMonths.map((period) => {
            const monthName = months.find(m => m.value === period.month)?.label || period.month;
            const isActive = selectedPeriod === period.key;

            return (
              <button
                key={period.key}
                type="button"
                onClick={() => setSelectedPeriod(period.key)}
                className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <span className="font-mono text-xs uppercase tracking-wider">
                  {monthName.slice(0, 3)}/{period.year.toString().slice(-2)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {isError && <QueryError onRetry={() => refetch()} />}

      {/* Total de entradas do mês */}
      {!isError && incomes.length > 0 && (
        <Card className="border-[color:var(--success)]/20 bg-[color:var(--success)]/[0.03]">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-lg bg-[color:var(--success)]/15 text-[color:var(--success)]">
                <ArrowDownLeft className="size-4" />
              </span>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Entradas do mês
                </p>
                <p className="text-sm font-medium text-muted-foreground">
                  Total acumulado
                </p>
              </div>
            </div>
            <span className="font-display text-3xl font-bold tabular text-[color:var(--success)]">
              R$ {formatCurrency(totalIncomes)}
            </span>
          </CardContent>
        </Card>
      )}

      {!isError && (
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
                      <ArrowDownLeft className="h-5 w-5 text-[color:var(--success)]" />
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
                      className="text-primary hover:bg-primary/10"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteIncome(income.id)}
                      className="text-destructive hover:bg-destructive/10"
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
                    <p className="font-semibold text-[color:var(--success)]">
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
      )}
    </div>
  );
};

export default IncomesPage;
