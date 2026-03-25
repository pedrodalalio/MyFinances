import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Plus,
  TrendingUp,
  Trash2,
  Edit,
  DollarSign,
  BarChart3,
  PieChart,
  Calendar,
  Coins,
  ChevronLeft,
  ChevronRight,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { InvestmentCharts } from "@/components/InvestmentCharts";

// Schema para investimentos unificados
const investmentFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Valor mensal deve ser um número positivo",
  }),
  initial_investment: z
    .string()
    .optional()
    .refine((val) => val === "" || (!isNaN(Number(val)) && Number(val) > 0), {
      message: "Valor investido deve ser um número positivo",
    }),
  gross_yield: z
    .string()
    .optional()
    .refine((val) => val === "" || (!isNaN(Number(val)) && Number(val) > 0), {
      message: "Valor atual deve ser um número positivo",
    }),
  investment_type: z.enum(
    [
      "STOCKS",
      "FUNDS",
      "CRYPTO",
      "SAVINGS",
      "CDB",
      "LCI_LCA",
      "DEBENTURES",
      "TREASURY",
      "OTHER",
    ],
    {
      required_error: "Tipo de investimento é obrigatório",
    },
  ),
  category: z.string().optional(),
  date: z.string().optional(),
  purchase_date: z.string().optional(),
  maturity_date: z.string().optional(),
  interest_rate: z.string().optional(),
  quantity: z.string().optional(),
  broker: z.string().optional(),
  notes: z.string().optional(),
});

type InvestmentFormValues = z.infer<typeof investmentFormSchema>;

interface Investment {
  id: string;
  name: string;
  description?: string;
  amount: number;
  initial_investment?: number;
  gross_yield?: number;
  investment_type: string;
  purpose: string;
  category?: string;
  month: string;
  year: number;
  date: string;
  purchase_date?: string;
  maturity_date?: string;
  interest_rate?: number;
  quantity?: number;
  broker?: string;
  status: string;
  notes?: string;
}

interface Portfolio {
  summary: {
    totalInvested: number;
    currentValue: number;
    totalReturn: number;
    returnPercentage: number;
    lastUpdated: string;
  };
  allInvestments: Investment[];
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
    TREASURY: "Tesouro Direto",
    OTHER: "Outros",
  };
  return labels[type] || type;
};

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return "default";
    case "MATURED":
      return "secondary";
    case "SOLD":
      return "outline";
    case "CANCELLED":
      return "destructive";
    default:
      return "default";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return "Ativo";
    case "MATURED":
      return "Vencido";
    case "SOLD":
      return "Vendido";
    case "CANCELLED":
      return "Cancelado";
    default:
      return status;
  }
};

const UnifiedInvestmentsPage = () => {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [monthlyInvestments, setMonthlyInvestments] = useState<Investment[]>(
    [],
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState("portfolio");
  const [selectedInvestmentType, setSelectedInvestmentType] =
    useState<string>("CDB");

  // Para monthly tracking
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return {
      month: (now.getMonth() + 1).toString().padStart(2, "0"),
      year: now.getFullYear(),
    };
  });

  const form = useForm<InvestmentFormValues>({
    resolver: zodResolver(investmentFormSchema),
    defaultValues: {
      name: "",
      description: "",
      amount: "",
      initial_investment: "",
      gross_yield: "",
      investment_type: "CDB",
      category: "",
      date: "",
      purchase_date: "",
      maturity_date: "",
      interest_rate: "",
      quantity: "",
      broker: "",
      notes: "",
    },
  });

  useEffect(() => {
    document.title = "Investimentos | MyFinances";
    loadPortfolio();
    loadMonthlyInvestments();
  }, [currentDate]);

  const loadPortfolio = async () => {
    try {
      const response = await api.get("/investments/portfolio");
      setPortfolio(response.data.portfolio);
    } catch (error) {
      console.error("Erro ao carregar portfolio:", error);
    }
  };

  const loadMonthlyInvestments = async () => {
    try {
      const response = await api.get(
        `/monthly-investments/${currentDate.month}/${currentDate.year}`,
      );
      setMonthlyInvestments(response.data.investments);
    } catch (error) {
      console.error("Erro ao carregar investimentos mensais:", error);
    }
  };

  const createInvestment = async (values: InvestmentFormValues) => {
    setLoading(true);
    try {
      const requestBody = {
        name: values.name,
        description: values.description,
        amount: parseFloat(values.amount),
        initial_investment: values.initial_investment
          ? parseFloat(values.initial_investment)
          : undefined,
        gross_yield: values.gross_yield
          ? parseFloat(values.gross_yield)
          : undefined,
        investment_type: values.investment_type,
        category: values.category,
        month: currentDate.month,
        year: currentDate.year,
        date: values.date || undefined,
        purchase_date: values.purchase_date || undefined,
        maturity_date: values.maturity_date || undefined,
        interest_rate: values.interest_rate
          ? parseFloat(values.interest_rate)
          : undefined,
        quantity: values.quantity ? parseFloat(values.quantity) : undefined,
        broker: values.broker || undefined,
        notes: values.notes || undefined,
      };

      await api.post("/monthly-investments", requestBody);
      setIsDialogOpen(false);
      form.reset();
      loadPortfolio();
      loadMonthlyInvestments();
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
        amount: parseFloat(values.amount),
        initial_investment: values.initial_investment
          ? parseFloat(values.initial_investment)
          : undefined,
        gross_yield: values.gross_yield
          ? parseFloat(values.gross_yield)
          : undefined,
        investment_type: values.investment_type,
        category: values.category,
        date: values.date || undefined,
        purchase_date: values.purchase_date || undefined,
        maturity_date: values.maturity_date || undefined,
        interest_rate: values.interest_rate
          ? parseFloat(values.interest_rate)
          : undefined,
        quantity: values.quantity ? parseFloat(values.quantity) : undefined,
        broker: values.broker || undefined,
        notes: values.notes || undefined,
      };

      await api.put(
        `/monthly-investments/${editingInvestment.id}`,
        requestBody,
      );
      setIsDialogOpen(false);
      setEditingInvestment(null);
      form.reset();
      loadPortfolio();
      loadMonthlyInvestments();
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
      loadPortfolio();
      loadMonthlyInvestments();
    } catch (error) {
      console.error("Erro ao deletar investimento:", error);
    }
  };

  const openEditDialog = (investment: Investment) => {
    setEditingInvestment(investment);
    setSelectedInvestmentType(investment.investment_type);
    form.reset({
      name: investment.name,
      description: investment.description || "",
      amount: investment.amount.toString(),
      initial_investment: investment.initial_investment?.toString() || "",
      gross_yield: investment.gross_yield?.toString() || "",
      investment_type: investment.investment_type as any,
      category: investment.category || "",
      date: investment.date
        ? investment.date.split("T")[0]
        : "",
      purchase_date: investment.purchase_date
        ? investment.purchase_date.split("T")[0]
        : "",
      maturity_date: investment.maturity_date
        ? investment.maturity_date.split("T")[0]
        : "",
      interest_rate: investment.interest_rate?.toString() || "",
      quantity: investment.quantity?.toString() || "",
      broker: investment.broker || "",
      notes: investment.notes || "",
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingInvestment(null);
    setSelectedInvestmentType("CDB");
    form.reset({
      name: "",
      description: "",
      amount: "",
      initial_investment: "",
      gross_yield: "",
      investment_type: "CDB",
      category: "",
      date: "",
      purchase_date: "",
      maturity_date: "",
      interest_rate: "",
      quantity: "",
      broker: "",
      notes: "",
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Investimentos</h1>
          <p className="text-muted-foreground">
            Gerencie seus investimentos e acompanhe seu portfolio
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openCreateDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Investimento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingInvestment ? "Editar" : "Novo"} Investimento
              </DialogTitle>
              <DialogDescription>
                {editingInvestment
                  ? "Edite as informações do investimento"
                  : "Adicione um novo investimento ao seu portfolio"}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Investimento</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: CDB Inter 110% CDI"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="investment_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedInvestmentType(value);
                            // Limpar category se não for Tesouro Direto
                            if (value !== "TREASURY") {
                              form.setValue("category", "");
                            }
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="CDB">CDB</SelectItem>
                            <SelectItem value="TREASURY">
                              Tesouro Direto
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor Investido</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="1000,00"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Campos dinâmicos baseados no tipo */}
                {selectedInvestmentType === "CDB" && (
                  <div className="border-t pt-4 space-y-4">
                    <h4 className="font-medium mb-3">Informações do CDB</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="interest_rate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Taxa (% a.a.)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Ex: 110"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="broker"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Banco/Corretora</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ex: Inter, XP, BTG..."
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
                        name="purchase_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data de Aplicação</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="maturity_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data de Vencimento</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="gross_yield"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Rendimento Bruto Atual (opcional)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Ex: 5250,00"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {selectedInvestmentType === "TREASURY" && (
                  <div className="border-t pt-4 space-y-4">
                    <h4 className="font-medium mb-3">
                      Informações do Tesouro Direto
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Título</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Selecione o título" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="SELIC">
                                  Tesouro Selic
                                </SelectItem>
                                <SelectItem value="PREFIXADO">
                                  Tesouro Prefixado
                                </SelectItem>
                                <SelectItem value="IPCA">
                                  Tesouro IPCA+
                                </SelectItem>
                                <SelectItem value="IPCA_SEMESTRAL">
                                  Tesouro IPCA+ com Juros Semestrais
                                </SelectItem>
                                <SelectItem value="PREFIXADO_SEMESTRAL">
                                  Tesouro Prefixado com Juros Semestrais
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="interest_rate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Taxa (% a.a.)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Ex: 12,50"
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
                        name="purchase_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data de Compra</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="maturity_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data de Vencimento</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantidade de Títulos</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.001"
                                placeholder="Ex: 0.5"
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
                      name="gross_yield"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Rendimento Bruto Atual (opcional)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Ex: 1050,00"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Observações sobre o investimento..."
                          className="min-h-[60px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading
                      ? "Salvando..."
                      : editingInvestment
                        ? "Atualizar"
                        : "Criar"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs para separar visualizações */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="portfolio" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Portfolio
          </TabsTrigger>
          <TabsTrigger value="monthly" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Fechamento Mensal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio" className="space-y-4">
          {/* Resumo do Portfolio */}
          {portfolio && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Investido
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(portfolio.summary.totalInvested)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Valor Atual
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(portfolio.summary.currentValue)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Retorno Total
                    </CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div
                      className={`text-2xl font-bold ${portfolio.summary.totalReturn >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatCurrency(portfolio.summary.totalReturn)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Rentabilidade
                    </CardTitle>
                    <PieChart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div
                      className={`text-2xl font-bold ${portfolio.summary.returnPercentage >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {portfolio.summary.returnPercentage.toFixed(2)}%
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Gráficos e Análises */}
              {portfolio.allInvestments.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Análise do Portfolio</h2>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openCreateDialog()}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar Investimento
                      </Button>
                    </div>
                  </div>
                  <InvestmentCharts investments={portfolio.allInvestments} />
                </div>
              )}
            </>
          )}

          {(!portfolio || portfolio.allInvestments.length === 0) && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Nenhum investimento no portfolio
                </h3>
                <p className="text-muted-foreground text-center mb-4">
                  Adicione investimentos com acompanhamento de portfolio para
                  ver análises detalhadas.
                </p>
                <Button onClick={() => openCreateDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Primeiro Investimento
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4">
          {/* Navegação de mês/ano */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Investimentos de {currentDate.month}/{currentDate.year}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const newMonth = parseInt(currentDate.month) - 1;
                      if (newMonth === 0) {
                        setCurrentDate({
                          month: "12",
                          year: currentDate.year - 1,
                        });
                      } else {
                        setCurrentDate({
                          month: newMonth.toString().padStart(2, "0"),
                          year: currentDate.year,
                        });
                      }
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">
                    {new Date(
                      currentDate.year,
                      parseInt(currentDate.month) - 1,
                    ).toLocaleDateString("pt-BR", {
                      year: "numeric",
                      month: "long",
                    })}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const newMonth = parseInt(currentDate.month) + 1;
                      if (newMonth === 13) {
                        setCurrentDate({
                          month: "01",
                          year: currentDate.year + 1,
                        });
                      } else {
                        setCurrentDate({
                          month: newMonth.toString().padStart(2, "0"),
                          year: currentDate.year,
                        });
                      }
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {monthlyInvestments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Coins className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Nenhum investimento neste mês
                  </h3>
                  <p className="text-muted-foreground text-center">
                    Adicione investimentos para este mês para acompanhar seu
                    histórico.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">
                          {formatCurrency(
                            monthlyInvestments.reduce(
                              (sum, inv) => sum + inv.amount,
                              0,
                            ),
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Total Investido no Mês
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">
                          {monthlyInvestments.length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Investimentos Realizados
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">
                          {formatCurrency(
                            monthlyInvestments.reduce(
                              (sum, inv) =>
                                sum + (inv.gross_yield || inv.amount),
                              0,
                            ),
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Valor Total em Portfolio
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {monthlyInvestments.map((investment) => (
                    <div
                      key={investment.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{investment.name}</h4>
                          <Badge variant="outline">
                            {getInvestmentTypeLabel(investment.investment_type)}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">
                              Valor Mensal:
                            </span>
                            <div className="font-medium text-lg">
                              {formatCurrency(investment.amount)}
                            </div>
                          </div>
                          {investment.gross_yield && (
                            <div>
                              <span className="text-muted-foreground">
                                Valor Atual Total:
                              </span>
                              <div className="font-medium">
                                {formatCurrency(investment.gross_yield)}
                              </div>
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground">Data:</span>
                            <div className="font-medium">
                              {new Date(investment.date).toLocaleDateString(
                                "pt-BR", { timeZone: "UTC" },
                              )}
                            </div>
                          </div>
                        </div>

                        {investment.description && (
                          <p className="text-sm text-muted-foreground">
                            {investment.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(investment)}
                          title="Editar investimento"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteInvestment(investment.id)}
                          className="text-red-500 hover:text-red-700"
                          title="Deletar investimento"
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UnifiedInvestmentsPage;
