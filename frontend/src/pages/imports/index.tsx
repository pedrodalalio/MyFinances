import React, { useEffect, useState, useRef } from "react";
import {
  Upload,
  FileUp,
  Check,
  X,
  Trash2,
  ChevronDown,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  FileText,
  Eye,
  Ban,
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
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("pt-BR", { timeZone: "UTC" });
};

const typeLabels: Record<string, string> = {
  EXPENSE: "Gasto",
  INCOME: "Entrada",
  INVESTMENT: "Investimento",
  TAX: "Imposto",
  TRANSFER: "Transferência",
  IGNORE: "Ignorar",
};

const typeColors: Record<string, string> = {
  EXPENSE: "text-red-500",
  INCOME: "text-green-500",
  INVESTMENT: "text-blue-500",
  TAX: "text-orange-500",
  TRANSFER: "text-gray-500",
  IGNORE: "text-gray-400",
};

const typeIcons: Record<string, React.ReactNode> = {
  EXPENSE: <ArrowUpRight className="h-4 w-4" />,
  INCOME: <ArrowDownLeft className="h-4 w-4" />,
  INVESTMENT: <TrendingUp className="h-4 w-4" />,
  TAX: <FileText className="h-4 w-4" />,
  TRANSFER: <ArrowUpRight className="h-4 w-4" />,
  IGNORE: <Ban className="h-4 w-4" />,
};

interface ImportTransaction {
  id: string;
  date: string;
  description: string;
  original_description: string;
  amount: string;
  type: string;
  category: string | null;
  is_credit: boolean;
  is_duplicate: boolean;
  duplicate_of: string | null;
  group_key: string | null;
}

interface ImportRecord {
  id: string;
  file_name: string;
  month: string;
  year: number;
  status: string;
  total_transactions: number;
  created_at: string;
  transactions?: ImportTransaction[];
  _count?: { transactions: number };
}

const months: Record<string, string> = {
  "01": "Janeiro",
  "02": "Fevereiro",
  "03": "Março",
  "04": "Abril",
  "05": "Maio",
  "06": "Junho",
  "07": "Julho",
  "08": "Agosto",
  "09": "Setembro",
  "10": "Outubro",
  "11": "Novembro",
  "12": "Dezembro",
};

const ImportsPage = () => {
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [selectedImport, setSelectedImport] = useState<ImportRecord | null>(
    null,
  );
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = "Importações | MyFinances";
    loadImports();
  }, []);

  const loadImports = async () => {
    try {
      const response = await api.get("/imports");
      setImports(response.data.imports || []);
    } catch (error) {
      console.error("Erro ao carregar importações:", error);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post("/imports/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Abrir detalhes da importação recém-criada
      setSelectedImport(response.data.import);
      setIsDetailOpen(true);
      loadImports();
    } catch (error: any) {
      const msg =
        error?.response?.data?.message || "Erro ao importar arquivo.";
      alert(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const openImportDetail = async (importRecord: ImportRecord) => {
    try {
      const response = await api.get(`/imports/${importRecord.id}`);
      setSelectedImport(response.data.import);
      setIsDetailOpen(true);
    } catch (error) {
      console.error("Erro ao carregar detalhes:", error);
    }
  };

  const updateTransactionType = async (
    transactionId: string,
    type: string,
  ) => {
    try {
      await api.put(`/imports/transactions/${transactionId}`, { type });
      // Atualizar localmente
      if (selectedImport?.transactions) {
        setSelectedImport({
          ...selectedImport,
          transactions: selectedImport.transactions.map((t) =>
            t.id === transactionId ? { ...t, type } : t,
          ),
        });
      }
    } catch (error) {
      console.error("Erro ao atualizar transação:", error);
    }
  };

  const updateTransactionCategory = async (
    transactionId: string,
    category: string,
  ) => {
    try {
      await api.put(`/imports/transactions/${transactionId}`, {
        category: category || null,
      });
      if (selectedImport?.transactions) {
        setSelectedImport({
          ...selectedImport,
          transactions: selectedImport.transactions.map((t) =>
            t.id === transactionId
              ? { ...t, category: category || null }
              : t,
          ),
        });
      }
    } catch (error) {
      console.error("Erro ao atualizar categoria:", error);
    }
  };

  const confirmImport = async () => {
    if (!selectedImport) return;

    setConfirming(true);
    try {
      const response = await api.post(
        `/imports/${selectedImport.id}/confirm`,
      );
      const c = response.data.counts;
      alert(
        `Importação confirmada!\n\nGastos: ${c.expenses}\nEntradas: ${c.incomes}\nInvestimentos: ${c.investments}\nImpostos: ${c.taxes}\nIgnorados: ${c.ignored}${c.grouped_transactions > 0 ? `\nTransações agrupadas: ${c.grouped_transactions}` : ''}`,
      );
      setIsDetailOpen(false);
      setSelectedImport(null);
      loadImports();
    } catch (error: any) {
      const msg =
        error?.response?.data?.message || "Erro ao confirmar importação.";
      alert(msg);
    } finally {
      setConfirming(false);
    }
  };

  const deleteImport = async (importId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta importação?")) return;

    try {
      await api.delete(`/imports/${importId}`);
      loadImports();
      if (selectedImport?.id === importId) {
        setIsDetailOpen(false);
        setSelectedImport(null);
      }
    } catch (error) {
      console.error("Erro ao excluir importação:", error);
    }
  };

  // Resumo das transações da importação selecionada
  const summary = selectedImport?.transactions
    ? {
        expenses: selectedImport.transactions.filter(
          (t) => t.type === "EXPENSE",
        ),
        incomes: selectedImport.transactions.filter(
          (t) => t.type === "INCOME",
        ),
        investments: selectedImport.transactions.filter(
          (t) => t.type === "INVESTMENT",
        ),
        taxes: selectedImport.transactions.filter((t) => t.type === "TAX"),
        ignored: selectedImport.transactions.filter(
          (t) => t.type === "IGNORE",
        ),
        totalExpenses: selectedImport.transactions
          .filter((t) => t.type === "EXPENSE")
          .reduce((s, t) => s + Number(t.amount), 0),
        totalIncomes: selectedImport.transactions
          .filter((t) => t.type === "INCOME")
          .reduce((s, t) => s + Number(t.amount), 0),
        totalInvestments: selectedImport.transactions
          .filter((t) => t.type === "INVESTMENT")
          .reduce((s, t) => s + Number(t.amount), 0),
        totalTaxes: selectedImport.transactions
          .filter((t) => t.type === "TAX")
          .reduce((s, t) => s + Number(t.amount), 0),
      }
    : null;

  // Calcular contagem por group_key para mostrar agrupamentos
  const groupCounts: Record<string, number> = {};
  if (selectedImport?.transactions) {
    for (const t of selectedImport.transactions) {
      if (t.group_key && t.type !== "IGNORE") {
        const key = `${t.group_key}_${t.type}`;
        groupCounts[key] = (groupCounts[key] || 0) + 1;
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Importações</h1>
          <p className="text-muted-foreground">
            Importe seu extrato bancário (CSV ou OFX) para categorizar suas
            transações automaticamente
          </p>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.ofx,.ofc,.txt"
            onChange={handleUpload}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Importando..." : "Importar Extrato"}
          </Button>
        </div>
      </div>

      {/* Lista de importações */}
      <div className="grid gap-4">
        {imports.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileUp className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Nenhuma importação realizada
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                Importe seu extrato bancário para começar a categorizar suas
                transações automaticamente.
              </p>
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Importar Primeiro Extrato
              </Button>
            </CardContent>
          </Card>
        ) : (
          imports.map((imp) => (
            <Card key={imp.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileUp className="h-5 w-5" />
                      {imp.file_name}
                    </CardTitle>
                    <CardDescription>
                      {months[imp.month]}/{imp.year} -{" "}
                      {imp._count?.transactions || imp.total_transactions}{" "}
                      transações
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        imp.status === "confirmed" ? "default" : "secondary"
                      }
                    >
                      {imp.status === "confirmed"
                        ? "Confirmado"
                        : imp.status === "reviewed"
                          ? "Revisado"
                          : "Pendente"}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openImportDetail(imp)}
                    >
                      <Eye className="mr-1 h-4 w-4" />
                      Ver
                    </Button>
                    {imp.status !== "confirmed" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteImport(imp.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      {/* Modal de detalhes da importação */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent
          className="max-w-5xl max-h-[90vh] overflow-y-auto"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>
              Revisar Importação - {selectedImport?.file_name}
            </DialogTitle>
            <DialogDescription>
              {selectedImport &&
                `${months[selectedImport.month]}/${selectedImport.year}`}{" "}
              - Revise e ajuste a categorização antes de confirmar
            </DialogDescription>
          </DialogHeader>

          {summary && (
            <div className="space-y-4">
              {/* Resumo */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Gastos</p>
                  <p className="text-lg font-bold text-red-500">
                    R$ {formatCurrency(summary.totalExpenses)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {summary.expenses.length} transações
                  </p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Entradas</p>
                  <p className="text-lg font-bold text-green-500">
                    R$ {formatCurrency(summary.totalIncomes)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {summary.incomes.length} transações
                  </p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Investimentos</p>
                  <p className="text-lg font-bold text-blue-500">
                    R$ {formatCurrency(summary.totalInvestments)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {summary.investments.length} transações
                  </p>
                </div>
                <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Impostos</p>
                  <p className="text-lg font-bold text-orange-500">
                    R$ {formatCurrency(summary.totalTaxes)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {summary.taxes.length} transações
                  </p>
                </div>
              </div>

              {(() => {
                const duplicates = selectedImport?.transactions?.filter(t => t.is_duplicate) || [];
                const ignoredNonDup = summary.ignored.filter(t => !t.is_duplicate);
                return (
                  <>
                    {duplicates.length > 0 && (
                      <p className="text-sm text-orange-500 font-medium">
                        {duplicates.length} possíveis duplicatas encontradas (marcadas como "Ignorar" — você pode alterar)
                      </p>
                    )}
                    {ignoredNonDup.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {ignoredNonDup.length} transações marcadas para ignorar
                      </p>
                    )}
                  </>
                );
              })()}

              {/* Lista de transações */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Transações</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2">Data</th>
                        <th className="text-left p-2">Descrição</th>
                        <th className="text-right p-2">Valor</th>
                        <th className="text-left p-2">Tipo</th>
                        <th className="text-left p-2">Categoria</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedImport?.transactions?.map((t) => (
                        <tr
                          key={t.id}
                          className={`border-b hover:bg-muted/30 ${t.type === "IGNORE" ? "opacity-40" : ""}`}
                        >
                          <td className="p-2 whitespace-nowrap">
                            {formatDate(t.date)}
                          </td>
                          <td className="p-2">
                            <div>
                              <span className="font-medium">
                                {t.description}
                              </span>
                              {t.original_description !== t.description && (
                                <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                                  {t.original_description}
                                </p>
                              )}
                              {t.is_duplicate && (
                                <p className="text-xs text-orange-500 font-medium">
                                  Possível duplicata de: "{t.duplicate_of}"
                                </p>
                              )}
                              {t.group_key && !t.is_duplicate && t.type !== "IGNORE" &&
                                groupCounts[`${t.group_key}_${t.type}`] > 1 && (
                                <p className="text-xs text-blue-500 font-medium">
                                  Será agrupado ({groupCounts[`${t.group_key}_${t.type}`]}x) — Total: R$ {formatCurrency(
                                    selectedImport!.transactions!
                                      .filter(x => x.group_key === t.group_key && x.type === t.type)
                                      .reduce((s, x) => s + Number(x.amount), 0)
                                  )}
                                </p>
                              )}
                            </div>
                          </td>
                          <td
                            className={`p-2 text-right whitespace-nowrap font-medium ${t.is_credit ? "text-green-500" : "text-red-500"}`}
                          >
                            {t.is_credit ? "+" : "-"} R${" "}
                            {formatCurrency(Number(t.amount))}
                          </td>
                          <td className="p-2">
                            {selectedImport.status !== "confirmed" ? (
                              <Select
                                value={t.type}
                                onValueChange={(value) =>
                                  updateTransactionType(t.id, value)
                                }
                              >
                                <SelectTrigger className="h-8 w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="EXPENSE">
                                    Gasto
                                  </SelectItem>
                                  <SelectItem value="INCOME">
                                    Entrada
                                  </SelectItem>
                                  <SelectItem value="INVESTMENT">
                                    Investimento
                                  </SelectItem>
                                  <SelectItem value="TAX">Imposto</SelectItem>
                                  <SelectItem value="TRANSFER">
                                    Transferência
                                  </SelectItem>
                                  <SelectItem value="IGNORE">
                                    Ignorar
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <span
                                className={`flex items-center gap-1 ${typeColors[t.type]}`}
                              >
                                {typeIcons[t.type]}
                                {typeLabels[t.type]}
                              </span>
                            )}
                          </td>
                          <td className="p-2">
                            {selectedImport.status !== "confirmed" ? (
                              <Input
                                className="h-8 w-[140px]"
                                placeholder="Categoria"
                                defaultValue={t.category || ""}
                                onBlur={(e) =>
                                  updateTransactionCategory(
                                    t.id,
                                    e.target.value,
                                  )
                                }
                              />
                            ) : (
                              <span className="text-muted-foreground">
                                {t.category || "-"}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Botão de confirmar */}
              {selectedImport?.status !== "confirmed" && (
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsDetailOpen(false)}
                  >
                    Fechar
                  </Button>
                  <Button onClick={confirmImport} disabled={confirming}>
                    <Check className="mr-2 h-4 w-4" />
                    {confirming
                      ? "Confirmando..."
                      : "Confirmar e Salvar Transações"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImportsPage;
