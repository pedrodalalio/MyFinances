import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
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
  Coins,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Save,
  Loader2,
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
  net_value: z
    .string()
    .optional()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), {
      message: "Valor líquido deve ser um número positivo",
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
      "ETF",
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
  ticker: z.string().optional(),
  dividend_yield: z.string().optional(),
  notes: z.string().optional(),
});

type InvestmentFormValues = z.infer<typeof investmentFormSchema>;

interface Investment {
  id: string;
  name: string;
  description?: string;
  amount: number;
  initial_investment?: number;
  net_value?: number;
  gross_yield?: number;
  investment_type: string;
  purpose: string;
  category?: string;
  date: string;
  purchase_date?: string;
  maturity_date?: string;
  interest_rate?: number;
  quantity?: number;
  broker?: string;
  ticker?: string;
  dividend_yield?: number;
  status: string;
  notes?: string;
  updated_at?: string;
}

interface YieldInvestment {
  id: string;
  name: string;
  amount: number;
  gross_yield: number | null;
  net_value: number | null;
  investment_type: string;
  interest_rate: number | null;
  quantity: number | null;
  broker: string | null;
  ticker: string | null;
  purchase_date: string | null;
  status: string;
  updated_at: string | null;
}

interface InvestmentYieldUpdate {
  gross_yield: string;
  net_value: string;
}

interface Portfolio {
  summary: {
    totalInvested: number;
    currentValue: number;
    netValue: number;
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
    ETF: "ETF",
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

const getEffectiveAmount = (inv: { amount: number; quantity?: number; investment_type: string }): number => {
  if (inv.investment_type === "ETF" && inv.quantity) {
    return inv.amount * inv.quantity;
  }
  return inv.amount;
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
  const [searchParams] = useSearchParams();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "portfolio");
  const [selectedInvestmentType, setSelectedInvestmentType] =
    useState<string>("CDB");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedPortfolioGroups, setExpandedPortfolioGroups] = useState<Set<string>>(new Set());
  const [yieldInvestments, setYieldInvestments] = useState<YieldInvestment[]>([]);
  const [yieldUpdates, setYieldUpdates] = useState<Record<string, InvestmentYieldUpdate>>({});
  const [etfPrices, setEtfPrices] = useState<Record<string, string>>({});
  const [yieldSortBy, setYieldSortBy] = useState<"date" | "name">("date");
  const [savingYields, setSavingYields] = useState(false);
  const [loadingYields, setLoadingYields] = useState(false);
  const [portfolioFilter, setPortfolioFilter] = useState<string>("all");

  // Tipos disponíveis para filtro
  const availableInvestmentTypes = React.useMemo(() => {
    if (!portfolio) return [];
    const types = Array.from(new Set(portfolio.allInvestments.map(inv => inv.investment_type)));
    return types.map(type => ({ value: type, label: getInvestmentTypeLabel(type) }));
  }, [portfolio]);

  // Investimentos filtrados
  const filteredInvestments = React.useMemo(() => {
    if (!portfolio) return [];
    if (portfolioFilter === "all") return portfolio.allInvestments;
    return portfolio.allInvestments.filter(inv => inv.investment_type === portfolioFilter);
  }, [portfolio, portfolioFilter]);

  // Resumo calculado com base no filtro
  const filteredSummary = React.useMemo(() => {
    if (!portfolio) return null;
    if (portfolioFilter === "all") return portfolio.summary;

    let totalInvested = 0;
    let currentValue = 0;
    let netValue = 0;

    filteredInvestments.forEach(inv => {
      const effectiveAmount = getEffectiveAmount(inv);
      totalInvested += effectiveAmount;
      currentValue += inv.gross_yield ?? effectiveAmount;
      netValue += inv.net_value ?? inv.gross_yield ?? effectiveAmount;
    });

    const totalReturn = currentValue - totalInvested;
    const returnPercentage = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

    return {
      totalInvested,
      currentValue,
      netValue,
      totalReturn,
      returnPercentage,
      lastUpdated: portfolio.summary.lastUpdated,
    };
  }, [portfolio, portfolioFilter, filteredInvestments]);

  // Agrupar investimentos do portfolio por nome + taxa
  const portfolioGroups = React.useMemo(() => {
    if (!portfolio) return [];
    const groups = new Map<
      string,
      {
        key: string;
        name: string;
        type: string;
        rate: number | null;
        broker: string | null;
        investments: Investment[];
        totalAmount: number;
        totalGross: number;
        totalNet: number;
      }
    >();

    filteredInvestments.forEach((inv) => {
      const rate = inv.interest_rate ?? null;
      const key = `${inv.name}_${rate ?? "none"}`;
      const existing = groups.get(key);

      const effectiveAmount = getEffectiveAmount(inv);

      if (existing) {
        existing.investments.push(inv);
        existing.totalAmount += effectiveAmount;
        existing.totalGross += inv.gross_yield ?? effectiveAmount;
        existing.totalNet += inv.net_value ?? inv.gross_yield ?? effectiveAmount;
      } else {
        groups.set(key, {
          key,
          name: inv.name,
          type: inv.investment_type,
          rate,
          broker: inv.broker ?? null,
          investments: [inv],
          totalAmount: effectiveAmount,
          totalGross: inv.gross_yield ?? effectiveAmount,
          totalNet: inv.net_value ?? inv.gross_yield ?? effectiveAmount,
        });
      }
    });

    return Array.from(groups.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredInvestments]);

  const togglePortfolioGroup = (key: string) => {
    setExpandedPortfolioGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Para monthly tracking
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
  }, []);

  const loadPortfolio = async () => {
    try {
      const response = await api.get("/investments/portfolio");
      setPortfolio(response.data.portfolio);
    } catch (error) {
      console.error("Erro ao carregar portfolio:", error);
    }
  };

  const loadYieldInvestments = useCallback(async () => {
    try {
      setLoadingYields(true);
      const response = await api.get("/investments/portfolio");
      const investments: YieldInvestment[] = response.data.portfolio.allInvestments
        .filter((inv: YieldInvestment) => inv.status === "ACTIVE");
      setYieldInvestments(investments);

      const updates: Record<string, InvestmentYieldUpdate> = {};
      investments.forEach((inv) => {
        updates[inv.id] = {
          gross_yield: inv.gross_yield?.toString() || "",
          net_value: inv.net_value?.toString() || "",
        };
      });
      setYieldUpdates(updates);
    } catch (error) {
      console.error("Erro ao carregar investimentos:", error);
    } finally {
      setLoadingYields(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "yields") {
      loadYieldInvestments();
    }
  }, [activeTab, loadYieldInvestments]);

  const sortedYieldInvestments = React.useMemo(() => {
    const sorted = [...yieldInvestments].sort((a, b) => {
      // Primeiro agrupar por tipo
      if (a.investment_type !== b.investment_type) {
        return a.investment_type.localeCompare(b.investment_type);
      }
      // Dentro do tipo, ordenar pelo critério selecionado
      if (yieldSortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      const dateA = a.purchase_date ? new Date(a.purchase_date).getTime() : 0;
      const dateB = b.purchase_date ? new Date(b.purchase_date).getTime() : 0;
      return dateA - dateB;
    });
    return sorted;
  }, [yieldInvestments, yieldSortBy]);

  const handleYieldFieldChange = (
    investmentId: string,
    field: "gross_yield" | "net_value",
    value: string
  ) => {
    setYieldUpdates((prev) => ({
      ...prev,
      [investmentId]: {
        ...prev[investmentId],
        [field]: value,
      },
    }));
  };

  const handleSaveYields = async () => {
    try {
      setSavingYields(true);

      const updatePromises = yieldInvestments.map((inv) => {
        // Para ETFs, calcular gross_yield a partir do preço da cota
        if (inv.investment_type === "ETF" && inv.ticker) {
          const priceStr = etfPrices[inv.ticker];
          if (!priceStr) return Promise.resolve();
          const price = parseFloat(priceStr);
          if (isNaN(price) || !inv.quantity) return Promise.resolve();
          const grossYield = price * inv.quantity;
          return api.put(`/monthly-investments/${inv.id}`, { gross_yield: grossYield });
        }

        const update = yieldUpdates[inv.id];
        if (!update) return Promise.resolve();

        const grossYield = parseFloat(update.gross_yield);
        const netValue = parseFloat(update.net_value);

        const body: Record<string, number> = {};
        if (!isNaN(grossYield)) body.gross_yield = grossYield;
        if (!isNaN(netValue)) body.net_value = netValue;

        if (Object.keys(body).length === 0) return Promise.resolve();

        return api.put(`/monthly-investments/${inv.id}`, body);
      });

      await Promise.all(updatePromises);
      await loadPortfolio();
      await loadYieldInvestments();
    } catch (error) {
      console.error("Erro ao salvar rendimentos:", error);
    } finally {
      setSavingYields(false);
    }
  };

  const createInvestment = async (values: InvestmentFormValues) => {
    setLoading(true);
    try {
      const requestBody = {
        name: values.name,
        description: values.description,
        amount: parseFloat(values.amount),
        net_value: values.net_value
          ? parseFloat(values.net_value)
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
        ticker: values.ticker || undefined,
        dividend_yield: values.dividend_yield
          ? parseFloat(values.dividend_yield)
          : undefined,
        notes: values.notes || undefined,
      };

      await api.post("/monthly-investments", requestBody);
      setIsDialogOpen(false);
      form.reset();
      loadPortfolio();

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
        net_value: values.net_value
          ? parseFloat(values.net_value)
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
        ticker: values.ticker || undefined,
        dividend_yield: values.dividend_yield
          ? parseFloat(values.dividend_yield)
          : undefined,
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
      net_value: investment.net_value?.toString() || "",
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
      ticker: investment.ticker || "",
      dividend_yield: investment.dividend_yield?.toString() || "",
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
      ticker: "",
      dividend_yield: "",
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
                            <SelectItem value="ETF">ETF</SelectItem>
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

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="gross_yield"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Valor Bruto Atual (opcional)
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

                      <FormField
                        control={form.control}
                        name="net_value"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Valor Líquido Atual (opcional)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Ex: 4980,00"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
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

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="gross_yield"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Valor Bruto Atual (opcional)
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

                      <FormField
                        control={form.control}
                        name="net_value"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Valor Líquido Atual (opcional)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Ex: 980,00"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {selectedInvestmentType === "ETF" && (
                  <div className="border-t pt-4 space-y-4">
                    <h4 className="font-medium mb-3">Informações do ETF</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="ticker"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ticker</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ex: IVVB11, BOVA11..."
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
                            <FormLabel>Corretora</FormLabel>
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
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantidade de Cotas</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="1"
                                placeholder="Ex: 10"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="purchase_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data da Compra</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
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
          <TabsTrigger value="yields" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Rendimentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio" className="space-y-4">
          {/* Resumo do Portfolio */}
          {portfolio && filteredSummary && (
            <>
              {/* Filtro por tipo */}
              <div className="flex items-center gap-2">
                <Select value={portfolioFilter} onValueChange={setPortfolioFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrar por tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    {availableInvestmentTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Investido
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(filteredSummary.totalInvested)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Valor Bruto
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(filteredSummary.currentValue)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Valor Líquido
                    </CardTitle>
                    <Coins className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(filteredSummary.netValue)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Retorno Bruto
                    </CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div
                      className={`text-2xl font-bold ${filteredSummary.totalReturn >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatCurrency(filteredSummary.totalReturn)}
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
                      className={`text-2xl font-bold ${filteredSummary.returnPercentage >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {filteredSummary.returnPercentage.toFixed(2)}%
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Gráficos e Análises */}
              {filteredInvestments.length > 0 && (
                <InvestmentCharts investments={filteredInvestments} selectedFilter={portfolioFilter} />
              )}

              {/* Listagem agrupada */}
              {portfolioGroups.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Meus Investimentos</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openCreateDialog()}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Investimento
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {portfolioGroups.map((group) => {
                      const isExpanded = expandedPortfolioGroups.has(group.key);
                      const count = group.investments.length;
                      const returnValue = group.totalGross - group.totalAmount;
                      const returnPct = group.totalAmount > 0 ? (returnValue / group.totalAmount) * 100 : 0;

                      return (
                        <div key={group.key} className="border rounded-lg overflow-hidden">
                          <div
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => togglePortfolioGroup(group.key)}
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              {isExpanded
                                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              }
                              <h4 className="font-semibold">{group.name}</h4>
                              <Badge variant="outline">
                                {getInvestmentTypeLabel(group.type)}
                              </Badge>
                              {group.rate != null && (
                                <Badge variant="secondary" className="text-xs">
                                  {group.rate}% a.a.
                                </Badge>
                              )}
                              {group.broker && (
                                <Badge variant="secondary" className="text-xs">
                                  {group.broker}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                ({count} {count === 1 ? "aplicação" : "aplicações"})
                              </span>
                            </div>
                            <div className="grid grid-cols-4 gap-4 text-sm text-right">
                              <div>
                                <span className="text-muted-foreground text-xs block">Aplicado</span>
                                <span className="font-semibold">{formatCurrency(group.totalAmount)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground text-xs block">Bruto</span>
                                <span className="font-semibold">{formatCurrency(group.totalGross)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground text-xs block">Líquido</span>
                                <span className="font-semibold text-green-600">{formatCurrency(group.totalNet)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground text-xs block">Retorno</span>
                                <span className={`font-semibold ${returnPct >= 0 ? "text-green-600" : "text-red-600"}`}>
                                  {returnPct.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="border-t">
                              {group.investments.map((investment) => (
                                <div
                                  key={investment.id}
                                  className="p-3 px-4 border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="grid grid-cols-3 md:grid-cols-5 gap-3 text-sm flex-1">
                                      <div>
                                        <span className="text-muted-foreground text-xs">Aplicado</span>
                                        <div className="font-medium">{formatCurrency(investment.amount)}</div>
                                      </div>
                                      {investment.investment_type === "ETF" && investment.quantity != null && (
                                        <div>
                                          <span className="text-muted-foreground text-xs">Cotas</span>
                                          <div className="font-medium">{investment.quantity}</div>
                                        </div>
                                      )}
                                      {investment.investment_type === "ETF" && investment.quantity != null && (
                                        <div>
                                          <span className="text-muted-foreground text-xs">Total</span>
                                          <div className="font-medium">{formatCurrency(getEffectiveAmount(investment))}</div>
                                        </div>
                                      )}
                                      {investment.gross_yield != null && (
                                        <div>
                                          <span className="text-muted-foreground text-xs">Bruto</span>
                                          <div className="font-medium">{formatCurrency(investment.gross_yield)}</div>
                                        </div>
                                      )}
                                      {investment.net_value != null && (
                                        <div>
                                          <span className="text-muted-foreground text-xs">Líquido</span>
                                          <div className="font-medium text-green-600">{formatCurrency(investment.net_value)}</div>
                                        </div>
                                      )}
                                      {investment.purchase_date && (
                                        <div>
                                          <span className="text-muted-foreground text-xs">Aplicação</span>
                                          <div className="font-medium">{new Date(investment.purchase_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</div>
                                        </div>
                                      )}
                                      {investment.maturity_date && (
                                        <div>
                                          <span className="text-muted-foreground text-xs">Vencimento</span>
                                          <div className="font-medium">{new Date(investment.maturity_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</div>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 ml-2">
                                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEditDialog(investment); }}>
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      {deletingId === investment.id ? (
                                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                          <Button variant="destructive" size="sm" onClick={() => { deleteInvestment(investment.id); setDeletingId(null); }}>
                                            Confirmar
                                          </Button>
                                          <Button variant="outline" size="sm" onClick={() => setDeletingId(null)}>
                                            Cancelar
                                          </Button>
                                        </div>
                                      ) : (
                                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDeletingId(investment.id); }} className="text-red-500 hover:text-red-700">
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
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

        <TabsContent value="yields" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Atualizar Rendimentos dos Investimentos</CardTitle>
                <Select value={yieldSortBy} onValueChange={(v) => setYieldSortBy(v as "date" | "name")}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Ordenar por Data</SelectItem>
                    <SelectItem value="name">Ordenar por Nome</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">
                Atualize os valores brutos e líquidos de cada investimento conforme o app do banco.
                Os valores devem ser o <strong>valor total atual</strong> (aplicado + rendimento).
              </p>
            </CardHeader>
            <CardContent>
              {loadingYields ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Carregando investimentos...</span>
                </div>
              ) : sortedYieldInvestments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum investimento ativo encontrado.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* ETFs agrupados por ticker */}
                  {(() => {
                    const etfInvestments = sortedYieldInvestments.filter(inv => inv.investment_type === "ETF" && inv.ticker);
                    const etfTickers = Array.from(new Set(etfInvestments.map(inv => inv.ticker!)));

                    if (etfTickers.length === 0) return null;

                    return (
                      <div className="space-y-4">
                        <h4 className="font-medium text-sm text-muted-foreground">ETFs</h4>
                        {etfTickers.map((ticker) => {
                          const tickerInvestments = etfInvestments.filter(inv => inv.ticker === ticker);
                          const totalCotas = tickerInvestments.reduce((sum, inv) => sum + (inv.quantity || 0), 0);
                          const totalInvestido = tickerInvestments.reduce((sum, inv) => sum + getEffectiveAmount(inv), 0);
                          const currentPrice = parseFloat(etfPrices[ticker] || "0");
                          const valorAtual = currentPrice > 0 ? currentPrice * totalCotas : 0;
                          const rendimento = valorAtual - totalInvestido;
                          const previousGrossTotal = tickerInvestments.reduce((sum, inv) => sum + (inv.gross_yield ?? getEffectiveAmount(inv)), 0);
                          const rendimentoDesdeUltima = valorAtual - previousGrossTotal;

                          return (
                            <div key={ticker} className="border rounded-lg p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium">{ticker}</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">ETF</Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {totalCotas} cotas
                                    </span>
                                    {tickerInvestments[0]?.broker && (
                                      <span className="text-xs text-muted-foreground">
                                        {tickerInvestments[0].broker}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-xs text-muted-foreground">Total Investido</span>
                                  <div className="font-semibold">{formatCurrency(totalInvestido)}</div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                                    Preço Atual da Cota (R$)
                                  </label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="Ex: 48.50"
                                    value={etfPrices[ticker] || ""}
                                    onChange={(e) =>
                                      setEtfPrices((prev) => ({ ...prev, [ticker]: e.target.value }))
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                                    Valor Atual Total
                                  </label>
                                  <div className="h-9 flex items-center font-semibold">
                                    {currentPrice > 0 ? formatCurrency(valorAtual) : "—"}
                                  </div>
                                </div>
                              </div>

                              {currentPrice > 0 && (
                                <div className="text-xs text-muted-foreground space-y-0.5">
                                  <div>
                                    Rendimento (total):{" "}
                                    <span
                                      className={`font-medium ${
                                        rendimento >= 0 ? "text-green-600" : "text-red-600"
                                      }`}
                                    >
                                      {formatCurrency(rendimento)} ({((rendimento / totalInvestido) * 100).toFixed(2)}%)
                                    </span>
                                  </div>
                                  <div>
                                    Rendimento desde última atualização:{" "}
                                    <span
                                      className={`font-medium ${
                                        rendimentoDesdeUltima >= 0 ? "text-green-600" : "text-red-600"
                                      }`}
                                    >
                                      {formatCurrency(rendimentoDesdeUltima)}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Outros investimentos (não-ETF) */}
                  {sortedYieldInvestments.filter(inv => inv.investment_type !== "ETF").map((inv) => {
                    const update = yieldUpdates[inv.id];
                    const currentGross = parseFloat(update?.gross_yield || "0");
                    const effectiveAmount = getEffectiveAmount(inv);
                    const rendimento = currentGross - effectiveAmount;

                    return (
                      <div
                        key={inv.id}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{inv.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {getInvestmentTypeLabel(inv.investment_type)}
                              </Badge>
                              {inv.interest_rate != null && (
                                <Badge variant="secondary" className="text-xs">
                                  {inv.interest_rate}% a.a.
                                </Badge>
                              )}
                              {inv.broker && (
                                <span className="text-xs text-muted-foreground">
                                  {inv.broker}
                                </span>
                              )}
                            </div>
                            {inv.updated_at && (
                              <span className="text-xs text-muted-foreground mt-1 block">
                                Atualizado em {new Date(inv.updated_at).toLocaleDateString("pt-BR")}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-muted-foreground">Aplicado</span>
                            <div className="font-semibold">{formatCurrency(effectiveAmount)}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">
                              Valor Bruto Atual
                            </label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Ex: 2685.52"
                              value={update?.gross_yield || ""}
                              onChange={(e) =>
                                handleYieldFieldChange(inv.id, "gross_yield", e.target.value)
                              }
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">
                              Valor Líquido Atual
                            </label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Ex: 2569.33"
                              value={update?.net_value || ""}
                              onChange={(e) =>
                                handleYieldFieldChange(inv.id, "net_value", e.target.value)
                              }
                            />
                          </div>
                        </div>

                        {currentGross > 0 && (() => {
                          const previousGross = inv.gross_yield ?? effectiveAmount;
                          const rendimentoDesdeUltima = currentGross - previousGross;
                          return (
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              <div>
                                Rendimento bruto (total):{" "}
                                <span
                                  className={`font-medium ${
                                    rendimento >= 0 ? "text-green-600" : "text-red-600"
                                  }`}
                                >
                                  {formatCurrency(rendimento)} ({((rendimento / effectiveAmount) * 100).toFixed(2)}%)
                                </span>
                              </div>
                              <div>
                                Rendimento desde última atualização:{" "}
                                <span
                                  className={`font-medium ${
                                    rendimentoDesdeUltima >= 0 ? "text-green-600" : "text-red-600"
                                  }`}
                                >
                                  {formatCurrency(rendimentoDesdeUltima)}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                      onClick={handleSaveYields}
                      disabled={savingYields}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {savingYields ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Salvar Rendimentos
                        </>
                      )}
                    </Button>
                  </div>
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
