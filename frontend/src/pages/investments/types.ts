import { z } from "zod";

// Schema do formulário de criação/edição de investimentos
export const investmentFormSchema = z.object({
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
      message: "Tipo de investimento é obrigatório",
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

export type InvestmentFormValues = z.infer<typeof investmentFormSchema>;

export const INVESTMENT_FORM_DEFAULTS: InvestmentFormValues = {
  name: "",
  description: "",
  amount: "",
  initial_investment: "",
  net_value: "",
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
};

export interface Investment {
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

export interface MaturedInvestment {
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

export interface InvestmentYieldUpdate {
  gross_yield: string;
  net_value: string;
}

export interface YieldChange {
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

export interface Portfolio {
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

export interface InvestmentHistoryEntry {
  date: string;
  grossYield: number;
  netValue: number | null;
}

export interface InvestmentHistory {
  id: string;
  history: InvestmentHistoryEntry[];
}

export type PeriodPreset = "30d" | "3m" | "6m" | "1y" | "all";

export const PERIOD_LABEL: Record<PeriodPreset, string> = {
  "30d": "Últimos 30 dias",
  "3m": "Últimos 3 meses",
  "6m": "Últimos 6 meses",
  "1y": "Último ano",
  all: "Desde o início",
};

export const formatCurrency = (value: number): string => {
  return (Math.round(value * 100) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

export const getInvestmentTypeLabel = (type: string): string => {
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

export const getTreasuryCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    SELIC: "Tesouro Selic",
    PREFIXADO: "Tesouro Prefixado",
    IPCA: "Tesouro IPCA+",
    IPCA_SEMESTRAL: "Tesouro IPCA+ com Juros Semestrais",
    PREFIXADO_SEMESTRAL: "Tesouro Prefixado com Juros Semestrais",
  };
  return labels[category] || category;
};

// ETF/FII são precificados por cota: valor efetivo = preço da cota × quantidade
export const getEffectiveAmount = (inv: {
  amount: number;
  quantity?: number | null;
  investment_type: string;
}): number => {
  if ((inv.investment_type === "ETF" || inv.investment_type === "FII") && inv.quantity) {
    return inv.amount * inv.quantity;
  }
  return inv.amount;
};
