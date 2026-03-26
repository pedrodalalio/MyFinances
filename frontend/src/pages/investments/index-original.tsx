import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, TrendingUp, Trash2, Edit, Calendar } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const investmentFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Valor deve ser um número positivo",
  }),
  investment_type: z.enum([
    "STOCKS",
    "FUNDS",
    "CRYPTO",
    "SAVINGS",
    "CDB",
    "LCI_LCA",
    "DEBENTURES",
    "TREASURY",
    "OTHER"
  ], {
    required_error: "Tipo de investimento é obrigatório",
  }),
  category: z.string().optional(),
  date: z.string().optional(),
});

type InvestmentFormValues = z.infer<typeof investmentFormSchema>;

interface Investment {
  id: string;
  name: string;
  description?: string;
  amount: number;
  investment_type: string;
  category?: string;
  date: string;
}

const formatCurrency = (value: number): string => {
  return (Math.round(value * 100) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
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
    OTHER: "Outros"
  };
  return labels[type] || type;
};

const getCurrentMonth = (): string => {
  return (new Date().getMonth() + 1).toString().padStart(2, "0");
};

const getCurrentYear = (): string => {
  return new Date().getFullYear().toString();
};

const InvestmentsPage = () => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(parseInt(getCurrentMonth()));
  const [selectedYear, setSelectedYear] = useState(parseInt(getCurrentYear()));

  const form = useForm<InvestmentFormValues>({
    resolver: zodResolver(investmentFormSchema),
    defaultValues: {
      name: "",
      description: "",
      amount: "",
      investment_type: "STOCKS",
      category: "",
      date: "",
    },
  });

  useEffect(() => {
    document.title = "Investimentos | MyFinances";
    loadInvestments();
  }, [selectedMonth, selectedYear]);

  const loadInvestments = async () => {
    try {
      const month = selectedMonth.toString().padStart(2, "0");
      const response = await api.get(`/monthly-investments/${month}/${selectedYear}`);
      setInvestments(response.data.investments || []);
    } catch (error) {
      console.error("Erro ao carregar investimentos:", error);
    }
  };

  const createInvestment = async (values: InvestmentFormValues) => {
    setLoading(true);
    try {
      const requestBody = {
        name: values.name,
        description: values.description,
        amount: Math.round(parseFloat(values.amount) * 100) / 100,
        investment_type: values.investment_type,
        category: values.category,
        date: values.date || new Date().toISOString(),
      };

      await api.post("/monthly-investments", requestBody);
      setIsDialogOpen(false);
      form.reset();
      loadInvestments();
    } catch (error) {
      console.error("Erro ao criar investimento:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateInvestment = async (values: InvestmentFormValues) => {
    if (!editingInvestment) return;

    setLoading(true);
    try {
      const requestBody = {
        name: values.name,
        description: values.description,
        amount: Math.round(parseFloat(values.amount) * 100) / 100,
        investment_type: values.investment_type,
        category: values.category,
        date: values.date || new Date().toISOString(),
      };

      await api.put(`/monthly-investments/${editingInvestment.id}`, requestBody);
      setIsDialogOpen(false);
      setEditingInvestment(null);
      form.reset();
      loadInvestments();
    } catch (error) {
      console.error("Erro ao atualizar investimento:", error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: InvestmentFormValues) => {
    if (editingInvestment) {
      await updateInvestment(values);
    } else {
      await createInvestment(values);
    }
  };

  const deleteInvestment = async (id: string) => {
    try {
      await api.delete(`/monthly-investments/${id}`);
      loadInvestments();
    } catch (error) {
      console.error("Erro ao deletar investimento:", error);
    }
  };

  const openEditDialog = (investment: Investment) => {
    setEditingInvestment(investment);
    form.reset({
      name: investment.name,
      description: investment.description || "",
      amount: investment.amount.toString(),
      investment_type: investment.investment_type as any,
      category: investment.category || "",
      date: investment.date || "",
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingInvestment(null);
    form.reset({
      name: "",
      description: "",
      amount: "",
      investment_type: "STOCKS",
      category: "",
      date: "",
    });
    setIsDialogOpen(true);
  };

  const months = [
    { value: 1, label: "Janeiro" },
    { value: 2, label: "Fevereiro" },
    { value: 3, label: "Março" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Maio" },
    { value: 6, label: "Junho" },
    { value: 7, label: "Julho" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Setembro" },
    { value: 10, label: "Outubro" },
    { value: 11, label: "Novembro" },
    { value: 12, label: "Dezembro" },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const totalInvestments = investments.reduce((sum, investment) => sum + investment.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Investimentos</h1>
          <p className="text-muted-foreground">
            Gerencie seus investimentos mensais
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Investimento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingInvestment ? "Editar" : "Novo"} Investimento
              </DialogTitle>
              <DialogDescription>
                {editingInvestment
                  ? "Edite as informações do investimento"
                  : "Adicione um novo investimento mensal"
                }
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Tesouro Selic" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="investment_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Investimento</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="STOCKS">Ações</SelectItem>
                            <SelectItem value="FUNDS">Fundos</SelectItem>
                            <SelectItem value="CRYPTO">Crypto</SelectItem>
                            <SelectItem value="SAVINGS">Poupança</SelectItem>
                            <SelectItem value="CDB">CDB</SelectItem>
                            <SelectItem value="LCI_LCA">LCI/LCA</SelectItem>
                            <SelectItem value="DEBENTURES">Debêntures</SelectItem>
                            <SelectItem value="TREASURY">Tesouro</SelectItem>
                            <SelectItem value="OTHER">Outros</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Descrição opcional"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Renda Fixa" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data do Investimento</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Salvando..." : editingInvestment ? "Atualizar" : "Criar"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Mês</label>
              <Select
                value={selectedMonth.toString()}
                onValueChange={(value) => setSelectedMonth(parseInt(value))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Ano</label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <div className="text-lg font-semibold text-green-600">
                Total: {formatCurrency(totalInvestments)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Investimentos */}
      <Card>
        <CardHeader>
          <CardTitle>Investimentos do Mês</CardTitle>
          <CardDescription>
            {months.find(m => m.value === selectedMonth)?.label} de {selectedYear}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {investments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum investimento encontrado</h3>
              <p className="text-muted-foreground text-center">
                Adicione seus primeiros investimentos para começar a organizar suas aplicações.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {investments.map((investment) => (
                <div
                  key={investment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{investment.name}</h4>
                      <Badge variant="outline">
                        {getInvestmentTypeLabel(investment.investment_type)}
                      </Badge>
                      {investment.category && (
                        <Badge variant="secondary" className="text-xs">
                          {investment.category}
                        </Badge>
                      )}
                    </div>
                    {investment.description && (
                      <p className="text-sm text-muted-foreground">
                        {investment.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        {new Date(investment.date).toLocaleDateString("pt-BR")}
                      </span>
                      {investment.expected_return && (
                        <span>Retorno esperado: {investment.expected_return}%</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="font-semibold text-green-600">
                        {formatCurrency(investment.amount)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(investment)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteInvestment(investment.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InvestmentsPage;