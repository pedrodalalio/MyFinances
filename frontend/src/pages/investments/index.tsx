import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Coins, PieChart, Plus, RefreshCw, TrendingUp, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { FiiIncomePanel } from "@/components/FiiIncomePanel";
import { FiiRankingPanel } from "@/components/FiiRankingPanel";
import { FiiSimulator } from "@/components/FiiSimulator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { PortfolioTab } from "./components/PortfolioTab";
import { YieldsTab } from "./components/YieldsTab";
import { InvestmentFormDialog } from "./components/InvestmentFormDialog";
import type { Investment, InvestmentFormValues, MaturedInvestment } from "./types";

interface FormDialogState {
  open: boolean;
  editing: Investment | null;
  prefill: Partial<InvestmentFormValues> | null;
}

const UnifiedInvestmentsPage = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "portfolio");
  const [formDialog, setFormDialog] = useState<FormDialogState>({
    open: false,
    editing: null,
    prefill: null,
  });

  useEffect(() => {
    document.title = "Investimentos | MyFinances";
  }, []);

  const openCreateDialog = () =>
    setFormDialog({ open: true, editing: null, prefill: null });

  const openEditDialog = (investment: Investment) =>
    setFormDialog({ open: true, editing: investment, prefill: null });

  // Após resgatar no modo reinvestir, abre o cadastro de um novo investimento
  // pré-preenchido com os dados do investimento vencido
  const openCreateFromReinvest = (
    source: MaturedInvestment,
    amount: number,
    purchaseDateISO: string,
  ) => {
    setFormDialog({
      open: true,
      editing: null,
      prefill: {
        name: source.name,
        description: source.description || "",
        amount: amount.toString(),
        investment_type: source.investment_type as InvestmentFormValues["investment_type"],
        category: source.category || "",
        purchase_date: purchaseDateISO,
        interest_rate: source.interest_rate?.toString() || "",
        quantity: source.quantity?.toString() || "",
        broker: source.broker || "",
        ticker: source.ticker || "",
      },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Portfólio"
        title="Investimentos"
        description="Acompanhe o desempenho do seu portfólio e gerencie rendimentos."
        action={
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Novo investimento
          </Button>
        }
      />

      {/* Tabs para separar visualizações */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="portfolio" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Portfolio
          </TabsTrigger>
          <TabsTrigger value="yields" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Rendimentos
          </TabsTrigger>
          <TabsTrigger value="proventos" className="flex items-center gap-2">
            <Coins className="h-4 w-4" />
            Proventos FII
          </TabsTrigger>
          <TabsTrigger value="ranking" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Ranking FII
          </TabsTrigger>
          <TabsTrigger value="simulador" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Simulador
          </TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio" className="space-y-4">
          <PortfolioTab
            onCreateInvestment={openCreateDialog}
            onEditInvestment={openEditDialog}
            onReinvest={openCreateFromReinvest}
          />
        </TabsContent>

        <TabsContent value="yields" className="space-y-4">
          <YieldsTab />
        </TabsContent>

        <TabsContent value="proventos" className="space-y-4">
          <FiiIncomePanel />
        </TabsContent>

        <TabsContent value="ranking" className="space-y-4">
          <FiiRankingPanel />
        </TabsContent>

        <TabsContent value="simulador" className="space-y-4">
          <FiiSimulator />
        </TabsContent>
      </Tabs>

      {/* Dialog de criação/edição de investimento */}
      <InvestmentFormDialog
        open={formDialog.open}
        onOpenChange={(open) => setFormDialog((prev) => ({ ...prev, open }))}
        editing={formDialog.editing}
        prefill={formDialog.prefill}
      />
    </div>
  );
};

export default UnifiedInvestmentsPage;
