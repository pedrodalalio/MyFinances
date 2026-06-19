import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Trash2,
  Edit,
  DollarSign,
  BarChart3,
  PieChart,
  Coins,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Upload,
  Save,
  Loader2,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/utils/api";
import { refreshBalanceSummary } from "@/components/BalanceSummary";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
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
      "FII",
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
  category: string | null;
  interest_rate: number | null;
  quantity: number | null;
  broker: string | null;
  ticker: string | null;
  purchase_date: string | null;
  maturity_date: string | null;
  status: string;
  updated_at: string | null;
}

interface MaturedInvestment {
  id: string;
  name: string;
  description: string | null;
  investment_type: string;
  category: string | null;
  amount: number;
  gross_yield: number | null;
  net_value: number | null;
  interest_rate: number | null;
  quantity: number | null;
  broker: string | null;
  ticker: string | null;
  purchase_date: string | null;
  maturity_date: string | null;
}

interface InvestmentYieldUpdate {
  gross_yield: string;
  net_value: string;
}

interface YieldChange {
  id: string;
  name: string;
  type: string;
  previousGrossYield: number;
  newGrossYield: number;
  grossYieldDiff: number;
  grossYieldDiffPercent: number;
  previousNetValue: number;
  newNetValue: number;
  netValueDiff: number;
  netValueDiffPercent: number;
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
    FII: "FII",
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

const getTreasuryCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    SELIC: "Tesouro Selic",
    PREFIXADO: "Tesouro Prefixado",
    IPCA: "Tesouro IPCA+",
    IPCA_SEMESTRAL: "Tesouro IPCA+ com Juros Semestrais",
    PREFIXADO_SEMESTRAL: "Tesouro Prefixado com Juros Semestrais",
  };
  return labels[category] || category;
};

const getEffectiveAmount = (inv: { amount: number; quantity?: number; investment_type: string }): number => {
  if ((inv.investment_type === "ETF" || inv.investment_type === "FII") && inv.quantity) {
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
  const [fetchingQuotes, setFetchingQuotes] = useState(false);
  const [importingStatement, setImportingStatement] = useState(false);
  const statementInputRef = useRef<HTMLInputElement>(null);
  const [portfolioFilter, setPortfolioFilter] = useState<string>("all");
  const [isYieldSummaryOpen, setIsYieldSummaryOpen] = useState(false);
  const [yieldChanges, setYieldChanges] = useState<YieldChange[]>([]);
  const [maturedInvestments, setMaturedInvestments] = useState<MaturedInvestment[]>([]);
  const [redeemingInvestment, setRedeemingInvestment] = useState<MaturedInvestment | null>(null);
  const [redeemValue, setRedeemValue] = useState<string>("");
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemMode, setRedeemMode] = useState<"redeem" | "reinvest">("redeem");
  const [periodPreset, setPeriodPreset] = useState<"30d" | "3m" | "6m" | "1y" | "all">("30d");
  const [historyData, setHistoryData] = useState<Array<{
    id: string;
    history: Array<{ date: string; grossYield: number; netValue: number | null }>;
  }>>([]);

  // Tipos disponíveis para filtro
  const availableInvestmentTypes = React.useMemo(() => {
    if (!portfolio) return [];
    const types = Array.from(new Set(portfolio.allInvestments.map(inv => inv.investment_type)));
    return types.map(type => ({ value: type, label: getInvestmentTypeLabel(type) }));
  }, [portfolio]);

  // Investimentos filtrados (exclui encerrados: MATURED/SOLD/CANCELLED)
  const filteredInvestments = React.useMemo(() => {
    if (!portfolio) return [];
    const active = portfolio.allInvestments.filter(inv => inv.status === "ACTIVE");
    if (portfolioFilter === "all") return active;
    return active.filter(inv => inv.investment_type === portfolioFilter);
  }, [portfolio, portfolioFilter]);

  // Resumo calculado com base no filtro
  const filteredSummary = React.useMemo(() => {
    if (!portfolio) return null;
    if (portfolioFilter === "all") return portfolio.summary;

    let totalInvested = 0;
    let currentValue = 0;
    let netValue = 0;

    const nowTime = Date.now();
    filteredInvestments.forEach(inv => {
      if (inv.status !== "ACTIVE") return;
      if (inv.maturity_date && new Date(inv.maturity_date).getTime() <= nowTime) return;
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

  // Métricas de rendimento no período selecionado
  const periodMetrics = React.useMemo(() => {
    if (filteredInvestments.length === 0) return null;

    const now = Date.now();
    let startTime: number;
    let periodLengthMs: number;
    switch (periodPreset) {
      case "30d": periodLengthMs = 30 * 24 * 60 * 60 * 1000; startTime = now - periodLengthMs; break;
      case "3m": periodLengthMs = 90 * 24 * 60 * 60 * 1000; startTime = now - periodLengthMs; break;
      case "6m": periodLengthMs = 180 * 24 * 60 * 60 * 1000; startTime = now - periodLengthMs; break;
      case "1y": periodLengthMs = 365 * 24 * 60 * 60 * 1000; startTime = now - periodLengthMs; break;
      case "all": periodLengthMs = Number.POSITIVE_INFINITY; startTime = 0; break;
    }

    const historyMap = new Map(historyData.map(h => [h.id, h.history]));

    let totalStart = 0;
    let totalEnd = 0;
    let countWithData = 0;
    const perInvestment = new Map<string, { startValue: number; endValue: number; hasData: boolean }>();

    filteredInvestments.forEach(inv => {
      const history = historyMap.get(inv.id) || [];
      const effectiveAmount = getEffectiveAmount(inv);
      const endValue = inv.gross_yield ?? effectiveAmount;

      let startValue: number | null = null;

      if (periodPreset === "all") {
        // Desde o início → base é o principal investido
        startValue = effectiveAmount;
      } else {
        const before = history.filter(h => new Date(h.date).getTime() <= startTime);
        if (before.length === 0) {
          // Nenhum snapshot antes do início do período
          if (history.length > 0) {
            // Investimento criado dentro do período → ganho desde a criação cabe no período
            startValue = effectiveAmount;
          }
          // Sem snapshots → não dá para calcular delta confiável
        } else {
          const latestBefore = before[before.length - 1];
          const latestBeforeTime = new Date(latestBefore.date).getTime();
          const ageOfBaseline = startTime - latestBeforeTime;
          // Considera o snapshot "fresco" só se ele estiver dentro de uma janela
          // de tamanho do período antes do início do período. Snapshots muito
          // antigos não representam o valor no início do período → marca como
          // sem dados para evitar reportar ganho histórico como ganho do período.
          if (ageOfBaseline <= periodLengthMs) {
            startValue = latestBefore.grossYield;
          }
        }
      }

      if (startValue !== null) {
        totalStart += startValue;
        totalEnd += endValue;
        countWithData++;
        perInvestment.set(inv.id, { startValue, endValue, hasData: true });
      } else {
        perInvestment.set(inv.id, { startValue: effectiveAmount, endValue, hasData: false });
      }
    });

    const rendimento = totalEnd - totalStart;
    const rentabilidade = totalStart > 0 ? (rendimento / totalStart) * 100 : 0;
    const totalCount = filteredInvestments.length;

    return { rendimento, rentabilidade, countWithData, totalCount, totalStart, totalEnd, perInvestment };
  }, [filteredInvestments, historyData, periodPreset]);

  const periodLabel: Record<typeof periodPreset, string> = {
    "30d": "Últimos 30 dias",
    "3m": "Últimos 3 meses",
    "6m": "Últimos 6 meses",
    "1y": "Último ano",
    "all": "Desde o início",
  };

  // Agrupar investimentos do portfolio por nome + taxa
  const portfolioGroups = React.useMemo(() => {
    if (!portfolio) return [];
    const perInv = periodMetrics?.perInvestment;
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
        periodStart: number;
        periodEnd: number;
        periodCount: number;
      }
    >();

    filteredInvestments.forEach((inv) => {
      const rate = inv.interest_rate ?? null;
      const key = `${inv.name}_${rate ?? "none"}`;
      const existing = groups.get(key);

      const effectiveAmount = getEffectiveAmount(inv);
      const period = perInv?.get(inv.id);
      const hasPeriod = period?.hasData ?? false;

      if (existing) {
        existing.investments.push(inv);
        existing.totalAmount += effectiveAmount;
        existing.totalGross += inv.gross_yield ?? effectiveAmount;
        existing.totalNet += inv.net_value ?? inv.gross_yield ?? effectiveAmount;
        if (hasPeriod && period) {
          existing.periodStart += period.startValue;
          existing.periodEnd += period.endValue;
          existing.periodCount++;
        }
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
          periodStart: hasPeriod && period ? period.startValue : 0,
          periodEnd: hasPeriod && period ? period.endValue : 0,
          periodCount: hasPeriod ? 1 : 0,
        });
      }
    });

    return Array.from(groups.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredInvestments, periodMetrics, portfolio]);

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
    loadMatured();
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await api.get("/investments/history");
      setHistoryData(response.data.investments || []);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    }
  };

  const loadPortfolio = async () => {
    try {
      const response = await api.get("/investments/portfolio");
      setPortfolio(response.data.portfolio);
    } catch (error) {
      console.error("Erro ao carregar portfolio:", error);
    }
  };

  const loadMatured = async () => {
    try {
      const response = await api.get("/investments/matured");
      setMaturedInvestments(response.data.investments || []);
    } catch (error) {
      console.error("Erro ao carregar vencidos:", error);
    }
  };

  const openRedeemDialog = (inv: MaturedInvestment, mode: "redeem" | "reinvest" = "redeem") => {
    setRedeemingInvestment(inv);
    setRedeemMode(mode);
    const suggested = inv.net_value ?? inv.gross_yield ?? inv.amount;
    setRedeemValue(suggested.toString());
  };

  const closeRedeemDialog = () => {
    setRedeemingInvestment(null);
    setRedeemValue("");
    setRedeemMode("redeem");
  };

  const openCreateFromReinvest = (
    source: MaturedInvestment,
    amount: number,
    purchaseDateISO: string
  ) => {
    setEditingInvestment(null);
    setSelectedInvestmentType(source.investment_type);
    form.reset({
      name: source.name,
      description: source.description || "",
      amount: amount.toString(),
      initial_investment: "",
      net_value: "",
      gross_yield: "",
      investment_type: source.investment_type as any,
      category: source.category || "",
      date: "",
      purchase_date: purchaseDateISO,
      maturity_date: "",
      interest_rate: source.interest_rate?.toString() || "",
      quantity: source.quantity?.toString() || "",
      broker: source.broker || "",
      ticker: source.ticker || "",
      dividend_yield: "",
      notes: "",
    });
    setIsDialogOpen(true);
  };

  const confirmRedeem = async () => {
    if (!redeemingInvestment) return;
    const value = parseFloat(redeemValue);
    if (isNaN(value) || value < 0) return;

    setRedeemLoading(true);
    try {
      const body = { final_value: value };
      await api.post(`/investments/${redeemingInvestment.id}/redeem`, body);

      const isReinvest = redeemMode === "reinvest";
      const source = redeemingInvestment;
      const dateForNew = source.maturity_date
        ? source.maturity_date.split("T")[0]
        : new Date().toISOString().split("T")[0];

      closeRedeemDialog();
      await Promise.all([loadPortfolio(), loadMatured(), loadHistory()]);
      refreshBalanceSummary();
      window.dispatchEvent(new Event("matured-updated"));

      if (isReinvest) {
        openCreateFromReinvest(source, value, dateForNew);
      }
    } catch (error) {
      console.error("Erro ao resgatar investimento:", error);
    } finally {
      setRedeemLoading(false);
    }
  };

  const reinvestFromMatured = (inv: MaturedInvestment) => {
    openRedeemDialog(inv, "reinvest");
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

  const handleFetchQuotes = async () => {
    try {
      setFetchingQuotes(true);
      const response = await api.get("/investments/quotes");
      const quotes: Array<{ ticker: string; price: number }> = response.data.quotes ?? [];
      const notFound: string[] = response.data.notFound ?? [];

      const priceMap = new Map<string, number>();
      quotes.forEach((q) => priceMap.set(q.ticker.trim().toUpperCase(), q.price));

      const updatedEtf: Record<string, string> = {};
      const grossById: Record<string, string> = {};
      const skippedNoQty: string[] = [];
      let applied = 0;

      yieldInvestments.forEach((inv) => {
        if (!inv.ticker) return;
        const price = priceMap.get(inv.ticker.trim().toUpperCase());
        if (price === undefined) return;

        if (inv.investment_type === "ETF" || inv.investment_type === "FII") {
          updatedEtf[inv.ticker] = price.toFixed(2);
          applied++;
        } else if (inv.quantity && inv.quantity > 0) {
          grossById[inv.id] = (price * inv.quantity).toFixed(2);
          applied++;
        } else {
          skippedNoQty.push(inv.ticker);
        }
      });

      if (Object.keys(updatedEtf).length > 0) {
        setEtfPrices((prev) => ({ ...prev, ...updatedEtf }));
      }
      if (Object.keys(grossById).length > 0) {
        setYieldUpdates((prev) => {
          const next = { ...prev };
          for (const [id, gross] of Object.entries(grossById)) {
            next[id] = {
              ...(next[id] ?? { gross_yield: "", net_value: "" }),
              gross_yield: gross,
            };
          }
          return next;
        });
      }

      if (applied === 0) {
        toast.info("Nenhuma cotação aplicada. Cadastre o ticker (e a quantidade) nos investimentos.");
      } else {
        toast.success(`${applied} cotação(ões) atualizada(s). Confira e clique em Salvar.`);
      }

      const warnings: string[] = [];
      if (notFound.length > 0) warnings.push(`não encontrados: ${notFound.join(", ")}`);
      if (skippedNoQty.length > 0) warnings.push(`sem quantidade: ${skippedNoQty.join(", ")}`);
      if (warnings.length > 0) toast.warning(warnings.join(" · "));
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 503) {
        toast.error("BRAPI_TOKEN não configurado no backend.");
      } else {
        toast.error("Não foi possível buscar as cotações. Tente novamente.");
      }
      console.error("Erro ao buscar cotações:", error);
    } finally {
      setFetchingQuotes(false);
    }
  };

  // Importa um extrato de renda fixa (PDF) e preenche os campos de bruto/líquido
  // dos CDBs (e afins) já cadastrados que baterem com os títulos do extrato.
  // Não salva: o usuário confere e clica em Salvar, como no "Atualizar cotações".
  const handleImportStatement = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // permite reenviar o mesmo arquivo
    if (!file) return;

    try {
      setImportingStatement(true);
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post("/investments/import-statement", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const matched: Array<{
        investmentId: string;
        newGross: number;
        newNet: number;
      }> = response.data.matched ?? [];
      const unmatched: Array<unknown> = response.data.unmatched ?? [];

      if (matched.length > 0) {
        setYieldUpdates((prev) => {
          const next = { ...prev };
          for (const m of matched) {
            next[m.investmentId] = {
              gross_yield: m.newGross.toFixed(2),
              net_value: m.newNet.toFixed(2),
            };
          }
          return next;
        });
        toast.success(
          `${matched.length} investimento(s) atualizado(s) pelo extrato. Confira e clique em Salvar.`
        );
      } else {
        toast.info(
          "Nenhum título do extrato bateu com os investimentos cadastrados. Confira data de aplicação e valor aplicado."
        );
      }

      if (unmatched.length > 0) {
        toast.warning(
          `${unmatched.length} título(s) do extrato sem investimento correspondente no app.`
        );
      }
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Não foi possível ler o extrato. Verifique o PDF.";
      toast.error(message);
      console.error("Erro ao importar extrato:", error);
    } finally {
      setImportingStatement(false);
    }
  };

  // Renderiza o bloco de atualização por cotação (preço da cota × quantidade),
  // agrupado por ticker. Usado tanto para ETF quanto para FII.
  const renderTickerYieldGroup = (typeKey: string, heading: string) => {
    const groupInvestments = sortedYieldInvestments.filter(
      (inv) => inv.investment_type === typeKey && inv.ticker
    );
    const tickers = Array.from(new Set(groupInvestments.map((inv) => inv.ticker!)));

    if (tickers.length === 0) return null;

    return (
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-muted-foreground">{heading}</h4>
        {tickers.map((ticker) => {
          const tickerInvestments = groupInvestments.filter((inv) => inv.ticker === ticker);
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
                    <Badge variant="outline" className="text-xs">{getInvestmentTypeLabel(typeKey)}</Badge>
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
                <div className="text-xs text-muted-foreground space-y-0.5 pt-2 border-t">
                  <div className="flex justify-between">
                    <span>Bruto atual:</span>
                    <span className="font-medium">{formatCurrency(valorAtual)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rendimento (total):</span>
                    <span className={`font-medium ${rendimento >= 0 ? "text-[color:var(--success)]" : "text-destructive"}`}>
                      {formatCurrency(rendimento)} ({((rendimento / totalInvestido) * 100).toFixed(2)}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rendimento desde última atualização:</span>
                    <span className={`font-medium ${rendimentoDesdeUltima >= 0 ? "text-[color:var(--success)]" : "text-destructive"}`}>
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
  };

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

  const handleSaveYields = () => {
    const changes: YieldChange[] = [];

    yieldInvestments.forEach((inv) => {
      let newGrossYield: number;
      let newNetValue: number;
      let prevGross: number;
      let prevNet: number;

      if ((inv.investment_type === "ETF" || inv.investment_type === "FII") && inv.ticker) {
        const priceStr = etfPrices[inv.ticker];
        if (!priceStr || priceStr.trim() === "") return;
        const price = parseFloat(priceStr);
        if (isNaN(price) || !inv.quantity) return;
        newGrossYield = price * inv.quantity;
        prevGross = inv.gross_yield ?? getEffectiveAmount(inv);
        prevNet = inv.net_value ?? prevGross;
        newNetValue = inv.net_value ?? newGrossYield;
      } else {
        const update = yieldUpdates[inv.id];
        if (!update) return;
        const grossEntered = update.gross_yield.trim();
        const netEntered = update.net_value.trim();
        if (grossEntered === "" && netEntered === "") return;
        prevGross = inv.gross_yield ?? getEffectiveAmount(inv);
        prevNet = inv.net_value ?? prevGross;
        newGrossYield = grossEntered === "" ? prevGross : parseFloat(grossEntered);
        newNetValue = netEntered === "" ? prevNet : parseFloat(netEntered);
        if (isNaN(newGrossYield) || isNaN(newNetValue)) return;
      }

      const grossChanged = Math.abs(newGrossYield - prevGross) > 0.001;
      const netChanged = Math.abs(newNetValue - prevNet) > 0.001;

      if (!grossChanged && !netChanged) return;

      const grossDiff = newGrossYield - prevGross;
      const grossDiffPercent = prevGross !== 0 ? (grossDiff / prevGross) * 100 : 0;
      const netDiff = newNetValue - prevNet;
      const netDiffPercent = prevNet !== 0 ? (netDiff / prevNet) * 100 : 0;

      changes.push({
        id: inv.id,
        name: inv.name,
        type: inv.investment_type,
        previousGrossYield: prevGross,
        newGrossYield,
        grossYieldDiff: grossDiff,
        grossYieldDiffPercent: grossDiffPercent,
        previousNetValue: prevNet,
        newNetValue,
        netValueDiff: netDiff,
        netValueDiffPercent: netDiffPercent,
      });
    });

    if (changes.length === 0) return;

    setYieldChanges(changes);
    setIsYieldSummaryOpen(true);
  };

  const confirmSaveYields = async () => {
    try {
      setSavingYields(true);
      setIsYieldSummaryOpen(false);

      const updatePromises = yieldInvestments.map((inv) => {
        if ((inv.investment_type === "ETF" || inv.investment_type === "FII") && inv.ticker) {
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
        if (!isNaN(grossYield) && grossYield !== (inv.gross_yield ?? 0)) body.gross_yield = grossYield;
        if (!isNaN(netValue) && netValue !== (inv.net_value ?? 0)) body.net_value = netValue;

        if (Object.keys(body).length === 0) return Promise.resolve();

        return api.put(`/monthly-investments/${inv.id}`, body);
      });

      await Promise.all(updatePromises);
      await loadPortfolio();
      await loadYieldInvestments();
      await loadHistory();
      refreshBalanceSummary();
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
      refreshBalanceSummary();

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
      refreshBalanceSummary();

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
      refreshBalanceSummary();

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
      <PageHeader
        eyebrow="Portfólio"
        title="Investimentos"
        description="Acompanhe o desempenho do seu portfólio e gerencie rendimentos."
        action={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openCreateDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Novo investimento
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
                            <SelectItem value="FII">FII</SelectItem>
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
                        <FormLabel>
                          {selectedInvestmentType === "ETF" || selectedInvestmentType === "FII"
                            ? "Preço por Cota (R$)"
                            : "Valor Investido"}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder={selectedInvestmentType === "ETF" || selectedInvestmentType === "FII" ? "Ex: 9.69" : "1000,00"}
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

                  </div>
                )}

                {(selectedInvestmentType === "ETF" || selectedInvestmentType === "FII") && (
                  <div className="border-t pt-4 space-y-4">
                    <h4 className="font-medium mb-3">
                      {selectedInvestmentType === "FII" ? "Informações do FII" : "Informações do ETF"}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="ticker"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ticker</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={selectedInvestmentType === "FII" ? "Ex: MXRF11, HGLG11..." : "Ex: IVVB11, BOVA11..."}
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
        }
      />

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
          {/* Investimentos vencidos pendentes de resgate */}
          {maturedInvestments.length > 0 && (
            <Card className="border-amber-500/60 bg-amber-50/40 dark:bg-amber-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-5 w-5" />
                  Investimentos vencidos pendentes
                  <Badge variant="secondary" className="ml-1">
                    {maturedInvestments.length}
                  </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Informe o valor final para que o dinheiro volte ao seu saldo como uma entrada.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {maturedInvestments.map((inv) => {
                  const projected = inv.net_value ?? inv.gross_yield ?? inv.amount;
                  return (
                    <div
                      key={inv.id}
                      className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-lg border bg-background p-4"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{inv.name}</span>
                          <Badge variant="outline">
                            {getInvestmentTypeLabel(inv.investment_type)}
                          </Badge>
                          {inv.broker && (
                            <Badge variant="secondary" className="text-xs">
                              {inv.broker}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Venceu em{" "}
                          {inv.maturity_date
                            ? new Date(inv.maturity_date).toLocaleDateString("pt-BR")
                            : "—"}
                          {" · "}Aplicado: {formatCurrency(inv.amount)}
                          {" · "}Projeção: {formatCurrency(projected)}
                        </div>
                      </div>
                      <div className="flex gap-2 md:justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => reinvestFromMatured(inv)}
                        >
                          <RotateCcw className="mr-2 h-3.5 w-3.5" />
                          Reinvestir
                        </Button>
                        <Button size="sm" onClick={() => openRedeemDialog(inv)}>
                          <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                          Resgatar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Resumo do Portfolio */}
          {portfolio && filteredSummary && (
            <>
              {/* Filtros: tipo + período */}
              <div className="flex flex-wrap items-center gap-2">
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

                <div className="inline-flex rounded-md border bg-background p-0.5">
                  {([
                    ["30d", "30d"],
                    ["3m", "3m"],
                    ["6m", "6m"],
                    ["1y", "1a"],
                    ["all", "Tudo"],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPeriodPreset(value)}
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                        periodPreset === value
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
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
                    <div className="text-2xl font-bold text-[color:var(--success)]">
                      {formatCurrency(filteredSummary.netValue)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Retorno Bruto · {periodLabel[periodPreset]}
                    </CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {periodMetrics && periodMetrics.countWithData > 0 ? (
                      <>
                        <div
                          className={`text-2xl font-bold ${periodMetrics.rendimento >= 0 ? "text-[color:var(--success)]" : "text-destructive"}`}
                        >
                          {periodMetrics.rendimento >= 0 ? "+" : ""}
                          {formatCurrency(periodMetrics.rendimento)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {periodMetrics.countWithData} de {periodMetrics.totalCount} com dados no período
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="text-2xl font-bold text-muted-foreground">—</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Sem snapshots suficientes no período
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Rentabilidade · {periodLabel[periodPreset]}
                    </CardTitle>
                    <PieChart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {periodMetrics && periodMetrics.countWithData > 0 ? (
                      <>
                        <div
                          className={`text-2xl font-bold ${periodMetrics.rentabilidade >= 0 ? "text-[color:var(--success)]" : "text-destructive"}`}
                        >
                          {periodMetrics.rentabilidade >= 0 ? "+" : ""}
                          {periodMetrics.rentabilidade.toFixed(2)}%
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Base: {formatCurrency(periodMetrics.totalStart)}
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="text-2xl font-bold text-muted-foreground">—</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Sem snapshots suficientes no período
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Gráficos e Análises */}
              {filteredInvestments.length > 0 && (
                <InvestmentCharts
                  investments={filteredInvestments}
                  selectedFilter={portfolioFilter}
                  periodLabel={periodLabel[periodPreset]}
                  periodData={periodMetrics?.perInvestment ?? new Map()}
                />
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
                      const hasPeriodData = group.periodCount > 0;
                      const periodReturnValue = hasPeriodData ? group.periodEnd - group.periodStart : 0;
                      const periodReturnPct = hasPeriodData && group.periodStart > 0
                        ? (periodReturnValue / group.periodStart) * 100
                        : 0;

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
                                <span className="font-semibold text-[color:var(--success)]">{formatCurrency(group.totalNet)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground text-xs block">Retorno · {periodLabel[periodPreset]}</span>
                                {hasPeriodData ? (
                                  <span className={`font-semibold ${periodReturnValue >= 0 ? "text-[color:var(--success)]" : "text-destructive"}`}>
                                    {periodReturnValue >= 0 ? "+" : ""}{formatCurrency(periodReturnValue)}
                                    <span className="text-xs ml-1">({periodReturnPct.toFixed(1)}%)</span>
                                  </span>
                                ) : (
                                  <span className="font-semibold text-muted-foreground">—</span>
                                )}
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
                                      {(investment.investment_type === "ETF" || investment.investment_type === "FII") && investment.quantity != null && (
                                        <div>
                                          <span className="text-muted-foreground text-xs">Cotas</span>
                                          <div className="font-medium">{investment.quantity}</div>
                                        </div>
                                      )}
                                      {(investment.investment_type === "ETF" || investment.investment_type === "FII") && investment.quantity != null && (
                                        <div>
                                          <span className="text-muted-foreground text-xs">Total</span>
                                          <div className="font-medium">{formatCurrency(getEffectiveAmount(investment))}</div>
                                        </div>
                                      )}
                                      {investment.investment_type === "TREASURY" && investment.quantity != null && (
                                        <div>
                                          <span className="text-muted-foreground text-xs">Títulos</span>
                                          <div className="font-medium">{investment.quantity}</div>
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
                                          <div className="font-medium text-[color:var(--success)]">{formatCurrency(investment.net_value)}</div>
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
                                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDeletingId(investment.id); }} className="text-destructive hover:text-destructive">
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
                <div className="flex items-center gap-2">
                  <input
                    ref={statementInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={handleImportStatement}
                  />
                  <Button
                    variant="outline"
                    onClick={() => statementInputRef.current?.click()}
                    disabled={importingStatement || loadingYields}
                  >
                    {importingStatement ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Importar extrato (PDF)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleFetchQuotes}
                    disabled={fetchingQuotes || loadingYields}
                  >
                    {fetchingQuotes ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Atualizar cotações
                  </Button>
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
              </div>
              <p className="text-sm text-muted-foreground">
                Atualize os valores brutos e líquidos de cada investimento conforme o app do banco.
                Os valores devem ser o <strong>valor total atual</strong> (aplicado + rendimento).
                Use <strong>Atualizar cotações</strong> para buscar os preços de ações, FIIs e ETFs
                automaticamente (BRAPI) nos ativos com ticker e quantidade cadastrados. Use
                {" "}<strong>Importar extrato (PDF)</strong> para preencher bruto/líquido dos CDBs e
                títulos de renda fixa a partir do extrato do banco. Confira e clique em Salvar.
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
                  {/* ETFs e FIIs agrupados por ticker (preço da cota × quantidade) */}
                  {renderTickerYieldGroup("ETF", "ETFs")}
                  {renderTickerYieldGroup("FII", "FIIs")}

                  {/* Tesouro Direto agrupado por categoria */}
                  {(() => {
                    const treasuryInvestments = sortedYieldInvestments.filter(inv => inv.investment_type === "TREASURY");
                    const treasuryCategories = Array.from(new Set(treasuryInvestments.map(inv => inv.category || "OUTROS")));

                    if (treasuryCategories.length === 0) return null;

                    return (
                      <div className="space-y-4">
                        <h4 className="font-medium text-sm text-muted-foreground">Tesouro Direto</h4>
                        {treasuryCategories.map((category) => {
                          const categoryInvestments = treasuryInvestments.filter(inv => (inv.category || "OUTROS") === category);
                          const totalInvestido = categoryInvestments.reduce((sum, inv) => sum + getEffectiveAmount(inv), 0);
                          const totalBrutoAnterior = categoryInvestments.reduce((sum, inv) => sum + (inv.gross_yield ?? getEffectiveAmount(inv)), 0);
                          const totalBrutoAtual = categoryInvestments.reduce((sum, inv) => {
                            const update = yieldUpdates[inv.id];
                            return sum + parseFloat(update?.gross_yield || "0");
                          }, 0);
                          const totalLiquidoAtual = categoryInvestments.reduce((sum, inv) => {
                            const update = yieldUpdates[inv.id];
                            return sum + parseFloat(update?.net_value || "0");
                          }, 0);
                          const rendimentoTotal = totalBrutoAtual - totalInvestido;
                          const rendimentoDesdeUltima = totalBrutoAtual - totalBrutoAnterior;

                          return (
                            <div key={category} className="border rounded-lg p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium">{getTreasuryCategoryLabel(category)}</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">Tesouro Direto</Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {categoryInvestments.length} {categoryInvestments.length === 1 ? "título" : "títulos"}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-xs text-muted-foreground">Total Investido</span>
                                  <div className="font-semibold">{formatCurrency(totalInvestido)}</div>
                                </div>
                              </div>

                              {/* Inputs individuais por título */}
                              <div className="space-y-3 pl-2 border-l-2 border-muted">
                                {categoryInvestments.map((inv) => {
                                  const update = yieldUpdates[inv.id];
                                  const effectiveAmount = getEffectiveAmount(inv);
                                  return (
                                    <div key={inv.id} className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-medium">{inv.name}</span>
                                          {inv.interest_rate != null && (
                                            <Badge variant="secondary" className="text-xs">
                                              {inv.interest_rate}% a.a.
                                            </Badge>
                                          )}
                                          {inv.maturity_date && (
                                            <span className="text-xs text-muted-foreground">
                                              Venc. {new Date(inv.maturity_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                          Aplicado: {formatCurrency(effectiveAmount)}
                                        </span>
                                      </div>
                                      {inv.updated_at && (
                                        <span className="text-xs text-muted-foreground block">
                                          Atualizado em {new Date(inv.updated_at).toLocaleDateString("pt-BR")}
                                        </span>
                                      )}
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
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Totais do grupo */}
                              {totalBrutoAtual > 0 && (
                                <div className="text-xs text-muted-foreground space-y-0.5 pt-2 border-t">
                                  <div className="flex justify-between">
                                    <span>Bruto atual (grupo):</span>
                                    <span className="font-medium">{formatCurrency(totalBrutoAtual)}</span>
                                  </div>
                                  {totalLiquidoAtual > 0 && (
                                    <div className="flex justify-between">
                                      <span>Líquido atual (grupo):</span>
                                      <span className="font-medium text-[color:var(--success)]">{formatCurrency(totalLiquidoAtual)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between">
                                    <span>Rendimento (total):</span>
                                    <span className={`font-medium ${rendimentoTotal >= 0 ? "text-[color:var(--success)]" : "text-destructive"}`}>
                                      {formatCurrency(rendimentoTotal)} ({totalInvestido > 0 ? ((rendimentoTotal / totalInvestido) * 100).toFixed(2) : "0.00"}%)
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Rendimento desde última atualização:</span>
                                    <span className={`font-medium ${rendimentoDesdeUltima >= 0 ? "text-[color:var(--success)]" : "text-destructive"}`}>
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

                  {/* Outros investimentos (não-ETF, não-FII e não-Tesouro) */}
                  {sortedYieldInvestments.filter(inv => inv.investment_type !== "ETF" && inv.investment_type !== "FII" && inv.investment_type !== "TREASURY").map((inv) => {
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
                                    rendimento >= 0 ? "text-[color:var(--success)]" : "text-destructive"
                                  }`}
                                >
                                  {formatCurrency(rendimento)} ({((rendimento / effectiveAmount) * 100).toFixed(2)}%)
                                </span>
                              </div>
                              <div>
                                Rendimento desde última atualização:{" "}
                                <span
                                  className={`font-medium ${
                                    rendimentoDesdeUltima >= 0 ? "text-[color:var(--success)]" : "text-destructive"
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
                      className=""
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

      {/* Modal de Resumo de Mudanças nos Rendimentos */}
      <Dialog open={isYieldSummaryOpen} onOpenChange={setIsYieldSummaryOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resumo das Alterações</DialogTitle>
            <DialogDescription>
              Confira as mudanças nos rendimentos antes de salvar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {yieldChanges.map((change) => (
              <div
                key={change.id}
                className="border border-border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-foreground">{change.name}</span>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {getInvestmentTypeLabel(change.type)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    {change.grossYieldDiff >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-[color:var(--success)]" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    )}
                    <span
                      className={`text-sm font-semibold ${
                        change.grossYieldDiff >= 0
                          ? "text-[color:var(--success)]"
                          : "text-destructive"
                      }`}
                    >
                      {change.grossYieldDiff >= 0 ? "+" : ""}
                      {formatCurrency(change.grossYieldDiff)}
                    </span>
                  </div>
                </div>

                {/* Valor Bruto */}
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground w-20">Bruto</span>
                  <span className="text-foreground">{formatCurrency(change.previousGrossYield)}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium text-foreground">{formatCurrency(change.newGrossYield)}</span>
                  <span
                    className={`text-xs ${
                      change.grossYieldDiffPercent >= 0
                        ? "text-[color:var(--success)]"
                        : "text-destructive"
                    }`}
                  >
                    ({change.grossYieldDiffPercent >= 0 ? "+" : ""}
                    {change.grossYieldDiffPercent.toFixed(2)}%)
                  </span>
                </div>

                {/* Valor Líquido (só mostra se mudou) */}
                {Math.abs(change.netValueDiff) > 0.001 && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground w-20">Líquido</span>
                    <span className="text-foreground">{formatCurrency(change.previousNetValue)}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium text-foreground">{formatCurrency(change.newNetValue)}</span>
                    <span
                      className={`text-xs ${
                        change.netValueDiffPercent >= 0
                          ? "text-[color:var(--success)]"
                          : "text-destructive"
                      }`}
                    >
                      ({change.netValueDiffPercent >= 0 ? "+" : ""}
                      {change.netValueDiffPercent.toFixed(2)}%)
                    </span>
                  </div>
                )}
              </div>
            ))}

            {/* Resumo Total */}
            {yieldChanges.length > 0 && (() => {
              const totalPrevGross = yieldChanges.reduce((s, c) => s + c.previousGrossYield, 0);
              const totalNewGross = yieldChanges.reduce((s, c) => s + c.newGrossYield, 0);
              const totalGrossDiff = totalNewGross - totalPrevGross;
              const totalGrossDiffPercent = totalPrevGross !== 0 ? (totalGrossDiff / totalPrevGross) * 100 : 0;

              return (
                <div className="border-t border-border pt-4 space-y-2">
                  <h4 className="font-semibold text-foreground">Resumo Total</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Valor Anterior</p>
                      <p className="font-medium text-foreground">{formatCurrency(totalPrevGross)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Novo Valor</p>
                      <p className="font-medium text-foreground">{formatCurrency(totalNewGross)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Diferença</p>
                      <p
                        className={`font-semibold ${
                          totalGrossDiff >= 0
                            ? "text-[color:var(--success)]"
                            : "text-destructive"
                        }`}
                      >
                        {totalGrossDiff >= 0 ? "+" : ""}
                        {formatCurrency(totalGrossDiff)} ({totalGrossDiffPercent >= 0 ? "+" : ""}
                        {totalGrossDiffPercent.toFixed(2)}%)
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {yieldChanges.length} investimento{yieldChanges.length > 1 ? "s" : ""} alterado{yieldChanges.length > 1 ? "s" : ""}
                  </p>
                </div>
              );
            })()}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsYieldSummaryOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmSaveYields}
              disabled={savingYields}
              className=""
            >
              {savingYields ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Confirmar e Salvar
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Resgate de Investimento Vencido */}
      <Dialog
        open={redeemingInvestment !== null}
        onOpenChange={(open) => !open && closeRedeemDialog()}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {redeemMode === "reinvest" ? "Reinvestir" : "Resgatar investimento"}
            </DialogTitle>
            <DialogDescription>
              {redeemingInvestment?.name} — informe o valor final do
              vencimento. Ele fecha o histórico do investimento atual e
              {redeemMode === "reinvest"
                ? " já abre o cadastro de um novo investimento com esse valor."
                : " volta como entrada no seu saldo."}
            </DialogDescription>
          </DialogHeader>

          {redeemingInvestment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Aplicado</p>
                  <p className="font-medium">
                    {formatCurrency(redeemingInvestment.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Projeção</p>
                  <p className="font-medium">
                    {formatCurrency(
                      redeemingInvestment.net_value ??
                        redeemingInvestment.gross_yield ??
                        redeemingInvestment.amount,
                    )}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Vencimento</p>
                  <p className="font-medium">
                    {redeemingInvestment.maturity_date
                      ? new Date(
                          redeemingInvestment.maturity_date,
                        ).toLocaleDateString("pt-BR")
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Valor final recebido</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={redeemValue}
                  onChange={(e) => setRedeemValue(e.target.value)}
                  placeholder="0,00"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={closeRedeemDialog}>
                  Cancelar
                </Button>
                <Button
                  onClick={confirmRedeem}
                  disabled={
                    redeemLoading ||
                    redeemValue === "" ||
                    isNaN(parseFloat(redeemValue)) ||
                    parseFloat(redeemValue) < 0
                  }
                >
                  {redeemLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {redeemMode === "reinvest" ? "Processando..." : "Resgatando..."}
                    </>
                  ) : (
                    <>
                      {redeemMode === "reinvest" ? (
                        <RotateCcw className="h-4 w-4 mr-2" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      {redeemMode === "reinvest" ? "Continuar para novo investimento" : "Confirmar resgate"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnifiedInvestmentsPage;
