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
  Building2,
  RefreshCw
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { UpdateAssetValueDialog } from "@/components/UpdateAssetValueDialog";
import { PortfolioCharts } from "@/components/PortfolioCharts";

const assetFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  asset_type: z.literal("CDB"),
  total_value: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Valor total deve ser um número positivo",
  }),
  gross_return: z.string().refine((val) => val === "" || (!isNaN(Number(val)) && Number(val) >= 0), {
    message: "Rendimento bruto deve ser um número positivo ou zero",
  }),
  purchase_date: z.string(),
  maturity_date: z.string().optional(),
  interest_rate: z.string().optional(),
  notes: z.string().optional(),
});

type AssetFormValues = z.infer<typeof assetFormSchema>;

interface Asset {
  id: string;
  name: string;
  asset_type: string;
  initial_investment: number;
  current_value: number;
  quantity?: number;
  purchase_date: string;
  maturity_date?: string;
  interest_rate?: number;
  status: string;
  notes?: string;
  broker?: string;
  history: Array<{
    id: string;
    value: number;
    date: string;
    notes?: string;
  }>;
}

interface Portfolio {
  id: string;
  total_invested: number;
  current_value: number;
  total_return: number;
  return_percentage: number;
  last_updated: string;
  assets: Asset[];
}

const formatCurrency = (value: number): string => {
  return (Math.round(value * 100) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

const getAssetTypeLabel = (type: string): string => {
  return "CDB"; // Sempre CDB agora
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

const PortfolioPage = () => {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [isUpdateValueDialogOpen, setIsUpdateValueDialogOpen] = useState(false);
  const [assetToUpdate, setAssetToUpdate] = useState<Asset | null>(null);

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      name: "",
      asset_type: "CDB",
      total_value: "",
      gross_return: "",
      purchase_date: "",
      maturity_date: "",
      interest_rate: "",
      notes: "",
    },
  });

  useEffect(() => {
    document.title = "Portfolio de Investimentos | MyFinances";
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    try {
      const response = await api.get("/cdbs");
      setPortfolio(response.data.portfolio);
    } catch (error) {
      console.error("Erro ao carregar portfolio:", error);
    }
  };

  const createAsset = async (values: AssetFormValues) => {
    setLoading(true);
    try {
      const totalValue = parseFloat(values.total_value);
      const grossReturn = values.gross_return ? parseFloat(values.gross_return) : 0;

      // Validação para evitar valores negativos
      if (grossReturn > totalValue) {
        alert("O rendimento bruto não pode ser maior que o valor total!");
        setLoading(false);
        return;
      }

      const initialInvestment = totalValue - grossReturn; // Valor investido inicialmente = valor atual - rendimento

      const requestBody = {
        name: values.name,
        asset_type: values.asset_type,
        initial_investment: initialInvestment,
        current_value: totalValue,
        purchase_date: values.purchase_date,
        maturity_date: values.maturity_date || undefined,
        interest_rate: values.interest_rate ? parseFloat(values.interest_rate) : undefined,
        notes: values.notes,
      };

      await api.post("/cdbs/assets", requestBody);
      setIsDialogOpen(false);
      form.reset();
      loadPortfolio();
    } catch (error) {
      console.error("Erro ao criar ativo:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateAsset = async (values: AssetFormValues) => {
    if (!editingAsset) return;

    setLoading(true);
    try {
      const totalValue = parseFloat(values.total_value);
      const grossReturn = values.gross_return ? parseFloat(values.gross_return) : 0;

      // Validação para evitar valores negativos
      if (grossReturn > totalValue) {
        alert("O rendimento bruto não pode ser maior que o valor total!");
        setLoading(false);
        return;
      }

      const initialInvestment = totalValue - grossReturn; // Valor investido inicialmente = valor atual - rendimento

      const requestBody = {
        name: values.name,
        asset_type: values.asset_type,
        initial_investment: initialInvestment,
        current_value: totalValue,
        purchase_date: values.purchase_date,
        maturity_date: values.maturity_date || undefined,
        interest_rate: values.interest_rate ? parseFloat(values.interest_rate) : undefined,
        notes: values.notes,
      };

      await api.put(`/cdbs/assets/${editingAsset.id}`, requestBody);
      setIsDialogOpen(false);
      setEditingAsset(null);
      form.reset();
      loadPortfolio();
    } catch (error) {
      console.error("Erro ao atualizar ativo:", error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: AssetFormValues) => {
    if (editingAsset) {
      await updateAsset(values);
    } else {
      await createAsset(values);
    }
  };

  const deleteAsset = async (id: string) => {
    try {
      await api.delete(`/cdbs/assets/${id}`);
      loadPortfolio();
    } catch (error) {
      console.error("Erro ao deletar ativo:", error);
    }
  };

  const openEditDialog = (asset: Asset) => {
    setEditingAsset(asset);
    const grossReturn = asset.current_value - asset.initial_investment;
    form.reset({
      name: asset.name,
      asset_type: asset.asset_type as any,
      total_value: asset.current_value.toString(),
      gross_return: grossReturn.toString(),
      purchase_date: new Date(asset.purchase_date).toISOString().split('T')[0],
      maturity_date: asset.maturity_date ? new Date(asset.maturity_date).toISOString().split('T')[0] : "",
      interest_rate: asset.interest_rate?.toString() || "",
      notes: asset.notes || "",
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingAsset(null);
    form.reset({
      name: "",
      asset_type: "CDB",
      total_value: "",
      gross_return: "",
      purchase_date: "",
      maturity_date: "",
      interest_rate: "",
      notes: "",
    });
    setIsDialogOpen(true);
  };

  const openUpdateValueDialog = (asset: Asset) => {
    setAssetToUpdate(asset);
    setIsUpdateValueDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meus CDBs</h1>
          <p className="text-muted-foreground">
            Acompanhe seus investimentos em CDB
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Novo CDB
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>
                {editingAsset ? "Editar" : "Novo"} CDB
              </DialogTitle>
              <DialogDescription>
                {editingAsset
                  ? "Edite as informações do CDB"
                  : "Adicione um novo CDB ao seu portfolio"
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
                        <FormLabel>Nome do CDB</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: CDB Inter 110% CDI" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="total_value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor Total</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="1050,00"
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
                    name="gross_return"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rendimento Bruto</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="50,00"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="interest_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Taxa (% a.a.) - opcional</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="110"
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
                        <FormLabel>Quando você comprou</FormLabel>
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
                        <FormLabel>Vencimento - opcional</FormLabel>
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
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações - opcional</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ex: CDB pré-fixado, líquido após IR..."
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
                    {loading ? "Salvando..." : editingAsset ? "Atualizar" : "Criar"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Resumo do Portfolio */}
      {portfolio && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Investido</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(portfolio.total_invested)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Atual</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(portfolio.current_value)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Retorno Total</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${portfolio.total_return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(portfolio.total_return)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rentabilidade</CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${portfolio.return_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {portfolio.return_percentage.toFixed(2)}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gráficos e Análises */}
      {portfolio && portfolio.assets.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Análise do Portfolio</h2>
          <PortfolioCharts assets={portfolio.assets} />
        </div>
      )}

      {/* Lista de CDBs */}
      <Card>
        <CardHeader>
          <CardTitle>Meus CDBs</CardTitle>
          <CardDescription>
            {portfolio?.assets.length || 0} CDB(s) no portfolio
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!portfolio || portfolio.assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum CDB cadastrado</h3>
              <p className="text-muted-foreground text-center">
                Adicione seus CDBs para acompanhar o crescimento dos seus investimentos.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {portfolio.assets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{asset.name}</h4>
                      <Badge variant="outline">
                        {getAssetTypeLabel(asset.asset_type)}
                      </Badge>
                      <Badge variant={getStatusBadgeColor(asset.status)}>
                        {getStatusLabel(asset.status)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Valor Total:</span>
                        <div className="font-medium text-lg">{formatCurrency(asset.current_value)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Valor Investido:</span>
                        <div className="font-medium">{formatCurrency(asset.initial_investment)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Rendimento Bruto:</span>
                        <div className={`font-medium ${(asset.current_value - asset.initial_investment) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(asset.current_value - asset.initial_investment)}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Desde:</span>
                        <div className="font-medium">
                          {new Date(asset.purchase_date).toLocaleDateString("pt-BR")}
                        </div>
                      </div>
                    </div>


                    {asset.maturity_date && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Vencimento: {new Date(asset.maturity_date).toLocaleDateString("pt-BR")}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openUpdateValueDialog(asset)}
                      title="Atualizar valor atual"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(asset)}
                      title="Editar CDB"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteAsset(asset.id)}
                      className="text-red-500 hover:text-red-700"
                      title="Deletar CDB"
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

      {/* Modal de Atualização de Valor */}
      <UpdateAssetValueDialog
        asset={assetToUpdate}
        isOpen={isUpdateValueDialogOpen}
        onClose={() => {
          setIsUpdateValueDialogOpen(false);
          setAssetToUpdate(null);
        }}
        onSuccess={() => {
          loadPortfolio();
        }}
      />
    </div>
  );
};

export default PortfolioPage;