import React, { useEffect, useState, useRef } from "react";
import {
  Upload,
  FileUp,
  Check,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  FileText,
  Eye,
  Ban,
  AlertTriangle,
} from "lucide-react";
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
  EXPENSE: "text-destructive",
  INCOME: "text-[color:var(--success)]",
  INVESTMENT: "text-primary",
  TAX: "text-[color:var(--warning)]",
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
  is_confirmed: boolean;
}

interface OrphanRecord {
  kind: string;
  name: string;
  amount: number;
  direction: string;
}

const orphanKindLabels: Record<string, string> = {
  expense: "Gasto",
  income: "Entrada",
  investment: "Investimento",
  tax: "Imposto",
  recurring: "Gasto fixo",
  salary: "Salário",
};

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

interface ImportDetailResponse {
  import: ImportRecord;
  orphans?: OrphanRecord[];
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
  const queryClient = useQueryClient();
  const [selectedImport, setSelectedImport] = useState<ImportRecord | null>(
    null,
  );
  const [orphans, setOrphans] = useState<OrphanRecord[]>([]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = "Importações | MyFinances";
  }, []);

  const importsQuery = useQuery({
    queryKey: queryKeys.imports,
    queryFn: async () => {
      const response = await api.get("/imports");
      return (response.data.imports || []) as ImportRecord[];
    },
  });
  const imports = importsQuery.data ?? [];

  // Confirmar transações cria gastos/entradas/investimentos/impostos:
  // invalida esses escopos além dos dados financeiros globais (saldo)
  const invalidateConfirmedRecords = () => {
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
    queryClient.invalidateQueries({ queryKey: ["incomes"] });
    queryClient.invalidateQueries({ queryKey: ["investments"] });
    queryClient.invalidateQueries({ queryKey: ["taxes"] });
    invalidateFinancialData();
  };

  // Atualiza uma transação da importação aberta localmente, sem refazer o fetch
  const patchSelectedTransaction = (
    transactionId: string,
    patch: Partial<ImportTransaction>,
  ) => {
    setSelectedImport((current) =>
      current?.transactions
        ? {
            ...current,
            transactions: current.transactions.map((t) =>
              t.id === transactionId ? { ...t, ...patch } : t,
            ),
          }
        : current,
    );
  };

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post("/imports/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data as ImportDetailResponse;
    },
    onSuccess: (data) => {
      // Abrir detalhes da importação recém-criada
      setSelectedImport(data.import);
      setOrphans(data.orphans || []);
      setIsDetailOpen(true);
      queryClient.invalidateQueries({ queryKey: queryKeys.imports });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Erro ao importar arquivo.",
      );
    },
    onSettled: () => {
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });
  const uploading = uploadMutation.isPending;

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadMutation.mutate(file);
  };

  const openImportDetail = async (importRecord: ImportRecord) => {
    try {
      // staleTime 0: sempre busca os detalhes atualizados ao abrir
      const data = await queryClient.fetchQuery({
        queryKey: [...queryKeys.imports, "detail", importRecord.id],
        queryFn: async () => {
          const response = await api.get(`/imports/${importRecord.id}`);
          return response.data as ImportDetailResponse;
        },
        staleTime: 0,
      });
      setSelectedImport(data.import);
      setOrphans(data.orphans || []);
      setIsDetailOpen(true);
    } catch {
      toast.error("Erro ao carregar detalhes da importação.");
    }
  };

  const updateTypeMutation = useMutation({
    mutationFn: async (payload: { transactionId: string; type: string }) =>
      api.put(`/imports/transactions/${payload.transactionId}`, {
        type: payload.type,
      }),
    onSuccess: (_data, { transactionId, type }) => {
      patchSelectedTransaction(transactionId, { type });
    },
    onError: () => {
      toast.error("Erro ao atualizar transação.");
    },
  });

  const updateTransactionType = (transactionId: string, type: string) => {
    updateTypeMutation.mutate({ transactionId, type });
  };

  const updateCategoryMutation = useMutation({
    mutationFn: async (payload: {
      transactionId: string;
      category: string | null;
    }) =>
      api.put(`/imports/transactions/${payload.transactionId}`, {
        category: payload.category,
      }),
    onSuccess: (_data, { transactionId, category }) => {
      patchSelectedTransaction(transactionId, { category });
    },
    onError: () => {
      toast.error("Erro ao atualizar categoria.");
    },
  });

  const updateTransactionCategory = (
    transactionId: string,
    category: string,
  ) => {
    updateCategoryMutation.mutate({
      transactionId,
      category: category || null,
    });
  };

  const confirmSingleMutation = useMutation({
    mutationFn: async (transactionId: string) =>
      api.post(`/imports/transactions/${transactionId}/confirm`),
    onSuccess: (_data, transactionId) => {
      patchSelectedTransaction(transactionId, { is_confirmed: true });
      invalidateConfirmedRecords();
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Erro ao cadastrar transação.",
      );
    },
  });
  const confirmingId = confirmSingleMutation.isPending
    ? (confirmSingleMutation.variables ?? null)
    : null;

  const confirmSingleTransaction = (transactionId: string) => {
    confirmSingleMutation.mutate(transactionId);
  };

  const confirmImportMutation = useMutation({
    mutationFn: async (importId: string) => {
      const response = await api.post(`/imports/${importId}/confirm`);
      return response.data;
    },
    onSuccess: (data) => {
      const c = data.counts;
      alert(
        `Importação confirmada!\n\nGastos: ${c.expenses}\nEntradas: ${c.incomes}\nInvestimentos: ${c.investments}\nImpostos: ${c.taxes}\nIgnorados: ${c.ignored}${c.grouped_transactions > 0 ? `\nTransações agrupadas: ${c.grouped_transactions}` : ''}`,
      );
      setIsDetailOpen(false);
      setSelectedImport(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.imports });
      invalidateConfirmedRecords();
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Erro ao confirmar importação.",
      );
    },
  });
  const confirming = confirmImportMutation.isPending;

  const confirmImport = () => {
    if (!selectedImport) return;
    confirmImportMutation.mutate(selectedImport.id);
  };

  const deleteImportMutation = useMutation({
    mutationFn: async (importId: string) => api.delete(`/imports/${importId}`),
    onSuccess: (_data, importId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.imports });
      if (selectedImport?.id === importId) {
        setIsDetailOpen(false);
        setSelectedImport(null);
      }
    },
    onError: () => {
      toast.error("Erro ao excluir importação.");
    },
  });

  const deleteImport = (importId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta importação?")) return;
    deleteImportMutation.mutate(importId);
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
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.ofx,.ofc,.txt,.pdf"
        onChange={handleUpload}
        className="hidden"
      />
      <PageHeader
        eyebrow="Sincronização"
        title="Importações"
        description="Importe extratos bancários (PDF, CSV ou OFX) e categorize transações automaticamente."
        action={
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Importando..." : "Importar extrato"}
          </Button>
        }
      />

      {/* Lista de importações */}
      <div className="grid gap-4">
        {importsQuery.isError ? (
          <QueryError onRetry={() => importsQuery.refetch()} />
        ) : imports.length === 0 ? (
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
                        className="text-destructive hover:text-destructive"
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
          className="w-[70vw] max-w-[1500px] sm:max-w-[1500px] max-h-[90vh] overflow-y-auto"
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
            <div className="space-y-4 min-w-0">
              {/* Resumo */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-destructive/10 rounded-lg">
                  <p className="text-xs text-muted-foreground">Gastos</p>
                  <p className="text-lg font-bold text-destructive">
                    R$ {formatCurrency(summary.totalExpenses)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {summary.expenses.length} transações
                  </p>
                </div>
                <div className="p-3 bg-[color:var(--success)]/10 rounded-lg">
                  <p className="text-xs text-muted-foreground">Entradas</p>
                  <p className="text-lg font-bold text-[color:var(--success)]">
                    R$ {formatCurrency(summary.totalIncomes)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {summary.incomes.length} transações
                  </p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <p className="text-xs text-muted-foreground">Investimentos</p>
                  <p className="text-lg font-bold text-primary">
                    R$ {formatCurrency(summary.totalInvestments)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {summary.investments.length} transações
                  </p>
                </div>
                <div className="p-3 bg-[color:var(--warning)]/10 rounded-lg">
                  <p className="text-xs text-muted-foreground">Impostos</p>
                  <p className="text-lg font-bold text-[color:var(--warning)]">
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
                      <p className="text-sm text-[color:var(--warning)] font-medium">
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
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full text-sm min-w-[640px]">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2">Data</th>
                        <th className="text-left p-2">Descrição</th>
                        <th className="text-right p-2">Valor</th>
                        <th className="text-left p-2">Tipo</th>
                        <th className="text-left p-2">Categoria</th>
                        <th className="text-right p-2">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedImport?.transactions?.map((t) => (
                        <tr
                          key={t.id}
                          className={`border-b hover:bg-muted/30 ${t.type === "IGNORE" ? "opacity-40" : ""} ${t.is_confirmed ? "bg-[color:var(--success)]/5" : ""}`}
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
                                <p className="text-xs text-[color:var(--warning)] font-medium">
                                  Possível duplicata de: "{t.duplicate_of}"
                                </p>
                              )}
                              {t.group_key && !t.is_duplicate && t.type !== "IGNORE" &&
                                groupCounts[`${t.group_key}_${t.type}`] > 1 && (
                                <p className="text-xs text-primary font-medium">
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
                            className={`p-2 text-right whitespace-nowrap font-medium ${t.is_credit ? "text-[color:var(--success)]" : "text-destructive"}`}
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
                          <td className="p-2 text-right whitespace-nowrap">
                            {selectedImport.status !== "confirmed" &&
                              (t.is_confirmed ? (
                                <span className="inline-flex items-center gap-1 text-xs text-[color:var(--success)] font-medium">
                                  <Check className="h-3 w-3" />
                                  Cadastrado
                                </span>
                              ) : t.type !== "IGNORE" && t.type !== "TRANSFER" ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7"
                                  disabled={confirmingId === t.id}
                                  onClick={() => confirmSingleTransaction(t.id)}
                                >
                                  {confirmingId === t.id
                                    ? "..."
                                    : "Cadastrar"}
                                </Button>
                              ) : null)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Registros órfãos: cadastrados no app mas ausentes no extrato */}
              {orphans.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-[color:var(--warning)]" />
                    <h3 className="font-semibold text-sm">
                      Cadastrado no app, mas não encontrado no extrato (
                      {orphans.length})
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Estes lançamentos existem no MyFinances mas não têm
                    correspondente neste extrato — podem ser erros de cadastro,
                    duplicados ou lançamentos de outro período/conta. Confira.
                  </p>
                  <div className="border border-[color:var(--warning)]/40 rounded-lg overflow-x-auto">
                    <table className="w-full text-sm min-w-[480px]">
                      <thead>
                        <tr className="border-b bg-[color:var(--warning)]/10">
                          <th className="text-left p-2">Tipo</th>
                          <th className="text-left p-2">Descrição</th>
                          <th className="text-right p-2">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orphans.map((o, i) => (
                          <tr key={i} className="border-b hover:bg-muted/30">
                            <td className="p-2 whitespace-nowrap">
                              {orphanKindLabels[o.kind] || o.kind}
                            </td>
                            <td className="p-2">{o.name}</td>
                            <td className="p-2 text-right whitespace-nowrap font-medium">
                              R$ {formatCurrency(Number(o.amount))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

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
