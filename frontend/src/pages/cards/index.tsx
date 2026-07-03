import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, CreditCard, Trash2, Edit, Check, X, Square } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/utils/api";
import { invalidateFinancialData, queryKeys } from "@/lib/query";
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
import { Switch } from "@/components/ui/switch";

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

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 13 }, (_, i) => currentYear - 2 + i);

const formatCurrency = (value: number): string => {
  return (Math.round(value * 100) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const cardPurchaseSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  total_amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Valor deve ser um número positivo",
  }),
  installments: z.string().optional(),
  start_month: z.string().min(1, "Mês de início é obrigatório"),
  start_year: z.string().min(1, "Ano de início é obrigatório"),
  end_month: z.string().optional(),
  end_year: z.string().optional(),
  category: z.string().optional(),
  // sem .default(): o form sempre fornece o valor e o zod v4 divergiria input/output
  is_recurring: z.boolean(),
}).refine((data) => {
  if (!data.is_recurring && (!data.installments || Number(data.installments) <= 0)) {
    return false;
  }
  return true;
}, {
  message: "Parcelas são obrigatórias para gastos não recorrentes",
  path: ["installments"],
});

type CardPurchaseFormValues = z.infer<typeof cardPurchaseSchema>;

interface Installment {
  id: string;
  purchase_id: string;
  purchase_name: string;
  installment_amount: number;
  current_installment: number;
  total_installments: number;
  month: string;
  year: number;
}

interface Purchase {
  id: string;
  name: string;
  description?: string;
  total_amount: number;
  installments?: number;
  installment_amount: number;
  start_month: string;
  start_year: number;
  end_month?: string;
  end_year?: number;
  category?: string;
  is_recurring: boolean;
  created_at: string;
  installments_data?: Installment[];
}

interface MonthlyPurchase {
  purchase: Purchase;
  installment: Installment | null;
  amount: number;
}

interface MonthlyBill {
  month: string;
  year: number;
  purchases: Purchase[];
  monthlyPurchases: MonthlyPurchase[];
  total: number;
}

const CardsPage = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [editingInstallmentId, setEditingInstallmentId] = useState<string | null>(null);
  const [editingInstallmentValue, setEditingInstallmentValue] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}`;
  });

  useEffect(() => {
    document.title = "Cartões | MyFinances";
  }, []);

  const form = useForm<CardPurchaseFormValues>({
    resolver: zodResolver(cardPurchaseSchema),
    defaultValues: {
      name: "",
      description: "",
      total_amount: "",
      installments: "",
      start_month: "",
      start_year: "",
      end_month: "",
      end_year: "",
      category: "",
      is_recurring: false,
    },
  });

  const isRecurring = form.watch("is_recurring");

  const {
    data: purchases = [],
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.creditCardPurchases,
    queryFn: async () => {
      const response = await api.get("/credit-cards/purchases");
      return (response.data.purchases || []) as Purchase[];
    },
  });

  // Invalida o recurso de cartões (lista e faturas por mês) e tudo que deriva
  // do saldo, já que os gastos de cartão afetam o fechamento do mês.
  const invalidatePurchases = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.creditCardPurchases });
    queryClient.invalidateQueries({ queryKey: ["credit-card"] });
    invalidateFinancialData();
  };

  const calculateEndDate = (startMonth: string, startYear: string, installments: string) => {
    if (!installments) return { end_month: undefined, end_year: undefined };

    const start = new Date(parseInt(startYear), parseInt(startMonth) - 1);
    const end = new Date(start);
    end.setMonth(end.getMonth() + parseInt(installments) - 1);

    return {
      end_month: (end.getMonth() + 1).toString().padStart(2, "0"),
      end_year: end.getFullYear(),
    };
  };

  const savePurchaseMutation = useMutation({
    mutationFn: async (values: CardPurchaseFormValues) => {
      const requestBody: any = {
        name: values.name,
        description: values.description,
        total_amount: Math.round(parseFloat(values.total_amount) * 100) / 100,
        start_month: values.start_month,
        start_year: parseInt(values.start_year),
        category: values.category,
        is_recurring: values.is_recurring,
      };

      if (editingPurchase) {
        if (values.is_recurring) {
          if (values.end_month && values.end_year) {
            requestBody.end_month = values.end_month;
            requestBody.end_year = parseInt(values.end_year);
          }
        } else if (values.installments) {
          const { end_month, end_year } = calculateEndDate(values.start_month, values.start_year, values.installments);
          requestBody.installments = parseInt(values.installments);
          requestBody.end_month = end_month;
          requestBody.end_year = end_year;
        }
        await api.put(`/credit-cards/purchases/${editingPurchase.id}`, requestBody);
      } else {
        if (!values.is_recurring && values.installments) {
          const { end_month, end_year } = calculateEndDate(values.start_month, values.start_year, values.installments);
          requestBody.installments = parseInt(values.installments);
          requestBody.end_month = end_month;
          requestBody.end_year = end_year;
        }
        await api.post("/credit-cards/purchases", requestBody);
      }
    },
    onSuccess: () => {
      setIsDialogOpen(false);
      setEditingPurchase(null);
      form.reset();
      invalidatePurchases();
    },
    onError: () => {
      toast.error(
        editingPurchase
          ? "Não foi possível atualizar o gasto."
          : "Não foi possível salvar o gasto.",
      );
    },
  });

  const loading = savePurchaseMutation.isPending;

  const onSubmit = (values: CardPurchaseFormValues) => {
    savePurchaseMutation.mutate(values);
  };

  const editPurchase = (purchase: Purchase) => {
    setEditingPurchase(purchase);
    form.reset({
      name: purchase.name,
      description: purchase.description || "",
      total_amount: Number(purchase.total_amount).toFixed(2),
      installments: purchase.installments?.toString() || "",
      start_month: purchase.start_month,
      start_year: purchase.start_year.toString(),
      end_month: purchase.end_month || "",
      end_year: purchase.end_year?.toString() || "",
      category: purchase.category || "",
      is_recurring: purchase.is_recurring,
    });
    setIsDialogOpen(true);
  };

  const deletePurchaseMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/credit-cards/purchases/${id}`),
    onSuccess: invalidatePurchases,
    onError: () => toast.error("Não foi possível excluir o gasto."),
  });

  const deletePurchase = (id: string) => deletePurchaseMutation.mutate(id);

  const saveInstallmentMutation = useMutation({
    mutationFn: ({ installmentId, amount }: { installmentId: string; amount: number }) =>
      api.put(`/credit-cards/installments/${installmentId}`, {
        installment_amount: amount,
      }),
    onSuccess: () => {
      setEditingInstallmentId(null);
      setEditingInstallmentValue("");
      invalidatePurchases();
    },
    onError: () => toast.error("Não foi possível atualizar a parcela."),
  });

  const saveInstallmentAmount = (installmentId: string, amount: number) =>
    saveInstallmentMutation.mutate({ installmentId, amount });

  const endRecurringMutation = useMutation({
    mutationFn: (purchase: Purchase) => {
      const [year, month] = selectedMonth.split("-");
      return api.put(`/credit-cards/purchases/${purchase.id}`, {
        name: purchase.name,
        description: purchase.description,
        total_amount: Number(purchase.total_amount),
        start_month: purchase.start_month,
        start_year: purchase.start_year,
        category: purchase.category,
        is_recurring: true,
        end_month: month,
        end_year: parseInt(year),
      });
    },
    onSuccess: invalidatePurchases,
    onError: () => toast.error("Não foi possível encerrar a recorrência."),
  });

  const endRecurring = (purchase: Purchase) => endRecurringMutation.mutate(purchase);

  const generateMonthlyBills = (): MonthlyBill[] => {
    const billsMap = new Map<string, MonthlyBill>();

    const addToBill = (purchase: Purchase, monthNum: number, yearNum: number) => {
      const monthStr = (monthNum + 1).toString().padStart(2, "0");
      const key = `${yearNum}-${monthStr}`;

      if (!billsMap.has(key)) {
        billsMap.set(key, {
          month: monthStr,
          year: yearNum,
          purchases: [],
          monthlyPurchases: [],
          total: 0
        });
      }

      const bill = billsMap.get(key)!;

      if (bill.purchases.find(p => p.id === purchase.id)) return;

      const installment = purchase.installments_data?.find(
        i => i.month === monthStr && i.year === yearNum
      ) || null;

      const amount = Number(installment ? installment.installment_amount : purchase.installment_amount);

      bill.purchases.push(purchase);
      bill.monthlyPurchases.push({ purchase, installment, amount });
      bill.total += amount;
    };

    purchases.forEach(purchase => {
      if (purchase.is_recurring) {
        const startDate = new Date(purchase.start_year, parseInt(purchase.start_month) - 1);
        const endDate = purchase.end_month && purchase.end_year
          ? new Date(purchase.end_year, parseInt(purchase.end_month) - 1)
          : new Date();
        let cm = startDate.getMonth();
        let cy = startDate.getFullYear();

        while (new Date(cy, cm) <= endDate) {
          addToBill(purchase, cm, cy);
          cm++;
          if (cm === 12) { cm = 0; cy++; }
        }
      } else {
        const startDate = new Date(purchase.start_year, parseInt(purchase.start_month) - 1);
        const endDate = new Date(purchase.end_year || purchase.start_year, parseInt(purchase.end_month || purchase.start_month) - 1);
        let cm = startDate.getMonth();
        let cy = startDate.getFullYear();

        while (new Date(cy, cm) <= endDate) {
          addToBill(purchase, cm, cy);
          cm++;
          if (cm === 12) { cm = 0; cy++; }
        }
      }
    });

    return Array.from(billsMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return parseInt(a.month) - parseInt(b.month);
    });
  };

  const monthlyBills = generateMonthlyBills();

  const getSelectedMonthData = () => {
    return monthlyBills.find(bill => `${bill.year}-${bill.month}` === selectedMonth) || {
      month: selectedMonth.split('-')[1],
      year: parseInt(selectedMonth.split('-')[0]),
      purchases: [],
      monthlyPurchases: [],
      total: 0
    };
  };

  const selectedMonthData = getSelectedMonthData();
  const selectedMonthName = months.find(m => m.value === selectedMonthData.month)?.label || selectedMonthData.month;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Crédito"
        title="Cartões"
        description="Gerencie gastos parcelados e recorrentes do seu cartão de crédito."
        action={
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingPurchase(null);
              form.reset();
            }
          }}>
            <Button onClick={() => {
              setEditingPurchase(null);
              form.reset({
                name: "",
                description: "",
                total_amount: "",
                installments: "",
                start_month: selectedMonth.split("-")[1],
                start_year: selectedMonth.split("-")[0],
                end_month: "",
                end_year: "",
                category: "",
                is_recurring: false,
              });
              setIsDialogOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Novo gasto
            </Button>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingPurchase ? "Editar Gasto no Cartão" : "Adicionar Gasto no Cartão"}
              </DialogTitle>
              <DialogDescription>
                {editingPurchase
                  ? "Edite as informações do gasto no seu cartão de crédito."
                  : "Adicione um novo gasto parcelado do seu cartão de crédito."
                }
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Gasto</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Compra no supermercado" {...field} />
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

                <FormField
                  control={form.control}
                  name="is_recurring"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Gasto Recorrente
                        </FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Marque para gastos permanentes (academia, streaming, etc.)
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="total_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {isRecurring ? "Valor Mensal" : "Valor Total"}
                        </FormLabel>
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

                  {!isRecurring && (
                    <FormField
                      control={form.control}
                      name="installments"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Parcelas</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="12"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="start_month"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mês de Início</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {months.map((month) => (
                              <SelectItem key={month.value} value={month.value}>
                                {month.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="start_year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ano de Início</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {years.map((year) => (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {isRecurring && editingPurchase && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="end_month"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mês de Encerramento</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sem fim" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {months.map((month) => (
                                <SelectItem key={month.value} value={month.value}>
                                  {month.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="end_year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ano de Encerramento</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sem fim" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {years.map((year) => (
                                <SelectItem key={year} value={year.toString()}>
                                  {year}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Alimentação, Lazer..." {...field} />
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
                      setEditingPurchase(null);
                      form.reset();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading
                      ? (editingPurchase ? "Atualizando..." : "Salvando...")
                      : (editingPurchase ? "Atualizar" : "Salvar")
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        }
      />

      {/* Carrossel de meses */}
      {!isError && purchases.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card/40 p-1">
          <div className="flex gap-1 min-w-max">
            {monthlyBills.map((bill) => {
              const monthKey = `${bill.year}-${bill.month}`;
              const monthName = months.find(m => m.value === bill.month)?.label || bill.month;
              const isActive = selectedMonth === monthKey;

              return (
                <button
                  key={monthKey}
                  type="button"
                  onClick={() => setSelectedMonth(monthKey)}
                  className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <span className="font-mono text-xs uppercase tracking-wider">
                    {monthName.slice(0, 3)}/{bill.year.toString().slice(-2)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isError ? (
        <QueryError onRetry={() => refetch()} />
      ) : purchases.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum gasto cadastrado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Comece adicionando seus gastos de cartão de crédito para acompanhar suas finanças.
            </p>
            <Button onClick={() => {
              setEditingPurchase(null);
              form.reset({
                name: "",
                description: "",
                total_amount: "",
                installments: "",
                start_month: selectedMonth.split("-")[1],
                start_year: selectedMonth.split("-")[0],
                category: "",
                is_recurring: false,
              });
              setIsDialogOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Primeiro Gasto
            </Button>
          </CardContent>
        </Card>
      ) : (
        
        <div className="space-y-6">
          {/* Resumo do mês selecionado */}
          <Card className="border-primary/20 bg-primary/[0.03]">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                    Fatura · {selectedMonthName} {selectedMonthData.year}
                  </p>
                  <CardTitle className="mt-2 flex items-center gap-2 font-display">
                    <CreditCard className="h-5 w-5 text-primary" />
                    {selectedMonthData.purchases.length === 0
                      ? "Sem lançamentos neste mês"
                      : `${selectedMonthData.purchases.length} ${selectedMonthData.purchases.length === 1 ? "gasto" : "gastos"}`}
                  </CardTitle>
                  <CardDescription>Total acumulado da fatura</CardDescription>
                </div>
                <div className="text-right">
                  <p className="font-display text-3xl font-bold tabular text-primary md:text-4xl">
                    R$ {formatCurrency(selectedMonthData.total)}
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Lista de gastos do mês */}
          {selectedMonthData.purchases.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum gasto em {selectedMonthName} {selectedMonthData.year}</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Não há gastos registrados para este mês.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {selectedMonthData.monthlyPurchases.map(({ purchase, installment, amount }) => (
                <Card key={purchase.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <CreditCard className="h-5 w-5" />
                          {purchase.name}
                        </CardTitle>
                        {purchase.description && (
                          <CardDescription>{purchase.description}</CardDescription>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {purchase.is_recurring && !purchase.end_month && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => endRecurring(purchase)}
                            title="Encerrar recorrência neste mês"
                            className="text-[color:var(--warning)] hover:bg-[color:var(--warning)]/10"
                          >
                            <Square className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => editPurchase(purchase)}
                          className="text-primary hover:bg-primary/10"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deletePurchase(purchase.id)}
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
                        <p className="text-muted-foreground">Valor Total</p>
                        <p className="font-semibold">
                          R$ {formatCurrency(purchase.total_amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">
                          {purchase.is_recurring ? "Valor Mensal" : "Parcela deste mês"}
                        </p>
                        {installment && editingInstallmentId === installment.id ? (
                          <div className="flex items-center gap-1 mt-1">
                            <Input
                              type="number"
                              step="0.01"
                              className="h-7 w-24 text-sm"
                              value={editingInstallmentValue}
                              onChange={(e) => setEditingInstallmentValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const val = parseFloat(editingInstallmentValue);
                                  if (!isNaN(val) && val > 0) saveInstallmentAmount(installment.id, val);
                                }
                                if (e.key === "Escape") {
                                  setEditingInstallmentId(null);
                                  setEditingInstallmentValue("");
                                }
                              }}
                              autoFocus
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => {
                                const val = parseFloat(editingInstallmentValue);
                                if (!isNaN(val) && val > 0) saveInstallmentAmount(installment.id, val);
                              }}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => {
                                setEditingInstallmentId(null);
                                setEditingInstallmentValue("");
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <p
                            className={`font-semibold ${installment ? "cursor-pointer hover:text-primary" : ""}`}
                            onClick={() => {
                              if (installment) {
                                setEditingInstallmentId(installment.id);
                                setEditingInstallmentValue(String(amount));
                              }
                            }}
                            title={installment ? "Clique para editar o valor desta parcela" : undefined}
                          >
                            R$ {formatCurrency(amount)}
                            {installment && !purchase.is_recurring && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({installment.current_installment}/{installment.total_installments})
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                      {!purchase.is_recurring && (
                        <div>
                          <p className="text-muted-foreground">Parcelas</p>
                          <p className="font-semibold">{purchase.installments}x</p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground">
                          {purchase.is_recurring ? "Início" : "Período"}
                        </p>
                        <p className="font-semibold">
                          {purchase.is_recurring
                            ? `${purchase.start_month}/${purchase.start_year} - ${purchase.end_month ? `${purchase.end_month}/${purchase.end_year}` : "Permanente"}`
                            : `${purchase.start_month}/${purchase.start_year} - ${purchase.end_month}/${purchase.end_year}`
                          }
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      {purchase.is_recurring && (
                        <Badge variant={purchase.end_month ? "secondary" : "default"}>
                          {purchase.end_month ? "Encerrado" : "Recorrente"}
                        </Badge>
                      )}
                      {purchase.category && (
                        <Badge variant="secondary">{purchase.category}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CardsPage;