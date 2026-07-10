import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";

import {
  INVESTMENT_FORM_DEFAULTS,
  investmentFormSchema,
  type Investment,
  type InvestmentFormValues,
} from "../types";
import {
  useCreateInvestmentMutation,
  useUpdateInvestmentMutation,
} from "../hooks/useInvestments";

interface InvestmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Investimento em edição (null = criação)
  editing: Investment | null;
  // Valores pré-preenchidos para criação (fluxo de reinvestimento / importação)
  prefill: Partial<InvestmentFormValues> | null;
  // Chamado após uma criação bem-sucedida (não dispara em edição). Recebe os
  // valores enviados — usado pelo fluxo de importação para somar a alocação.
  onCreated?: (values: InvestmentFormValues) => void;
}

// Converte os campos texto do formulário no corpo esperado pelo backend
const buildRequestBody = (values: InvestmentFormValues) => ({
  name: values.name,
  description: values.description,
  amount: parseFloat(values.amount),
  net_value: values.net_value ? parseFloat(values.net_value) : undefined,
  gross_yield: values.gross_yield ? parseFloat(values.gross_yield) : undefined,
  investment_type: values.investment_type,
  category: values.category,
  date: values.date || undefined,
  purchase_date: values.purchase_date || undefined,
  maturity_date: values.maturity_date || undefined,
  interest_rate: values.interest_rate ? parseFloat(values.interest_rate) : undefined,
  quantity: values.quantity ? parseFloat(values.quantity) : undefined,
  broker: values.broker || undefined,
  ticker: values.ticker || undefined,
  dividend_yield: values.dividend_yield ? parseFloat(values.dividend_yield) : undefined,
  is_reserve: values.is_reserve ?? false,
  notes: values.notes || undefined,
});

const valuesFromInvestment = (investment: Investment): InvestmentFormValues => ({
  name: investment.name,
  description: investment.description || "",
  amount: investment.amount.toString(),
  initial_investment: investment.initial_investment?.toString() || "",
  net_value: investment.net_value?.toString() || "",
  gross_yield: investment.gross_yield?.toString() || "",
  investment_type: investment.investment_type as InvestmentFormValues["investment_type"],
  category: investment.category || "",
  date: investment.date ? investment.date.split("T")[0] : "",
  purchase_date: investment.purchase_date ? investment.purchase_date.split("T")[0] : "",
  maturity_date: investment.maturity_date ? investment.maturity_date.split("T")[0] : "",
  interest_rate: investment.interest_rate?.toString() || "",
  quantity: investment.quantity?.toString() || "",
  broker: investment.broker || "",
  ticker: investment.ticker || "",
  dividend_yield: investment.dividend_yield?.toString() || "",
  is_reserve: investment.is_reserve ?? false,
  notes: investment.notes || "",
});

export function InvestmentFormDialog({
  open,
  onOpenChange,
  editing,
  prefill,
  onCreated,
}: InvestmentFormDialogProps) {
  const [selectedInvestmentType, setSelectedInvestmentType] = useState<string>("CDB");
  const createMutation = useCreateInvestmentMutation();
  const updateMutation = useUpdateInvestmentMutation();
  const loading = createMutation.isPending || updateMutation.isPending;

  const form = useForm<InvestmentFormValues>({
    resolver: zodResolver(investmentFormSchema),
    defaultValues: INVESTMENT_FORM_DEFAULTS,
  });

  // Repovoa o formulário sempre que o diálogo abre (criação, edição ou reinvestimento)
  useEffect(() => {
    if (!open) return;
    const values = editing
      ? valuesFromInvestment(editing)
      : { ...INVESTMENT_FORM_DEFAULTS, ...(prefill ?? {}) };
    setSelectedInvestmentType(values.investment_type);
    form.reset(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, prefill]);

  const onSubmit = async (values: InvestmentFormValues) => {
    const body = buildRequestBody(values);
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, body });
      } else {
        await createMutation.mutateAsync(body);
        onCreated?.(values);
      }
      onOpenChange(false);
      form.reset(INVESTMENT_FORM_DEFAULTS);
    } catch {
      // erro já tratado com toast no onError da mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar" : "Novo"} Investimento</DialogTitle>
          <DialogDescription>
            {editing
              ? "Edite as informações do investimento"
              : "Adicione um novo investimento ao seu portfolio"}
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
                    <FormLabel>Nome do Investimento</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: CDB Inter 110% CDI" {...field} />
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
                        <SelectItem value="TREASURY">Tesouro Direto</SelectItem>
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
                        placeholder={
                          selectedInvestmentType === "ETF" || selectedInvestmentType === "FII"
                            ? "Ex: 9.69"
                            : "1000,00"
                        }
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
                          <Input type="number" step="0.01" placeholder="Ex: 110" {...field} />
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
                          <Input placeholder="Ex: Inter, XP, BTG..." {...field} />
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
                        <FormLabel>Valor Bruto Atual (opcional)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="Ex: 5250,00" {...field} />
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
                        <FormLabel>Valor Líquido Atual (opcional)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="Ex: 4980,00" {...field} />
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
                <h4 className="font-medium mb-3">Informações do Tesouro Direto</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Título</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecione o título" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="SELIC">Tesouro Selic</SelectItem>
                            <SelectItem value="PREFIXADO">Tesouro Prefixado</SelectItem>
                            <SelectItem value="IPCA">Tesouro IPCA+</SelectItem>
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
                          <Input type="number" step="0.01" placeholder="Ex: 12,50" {...field} />
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
                          <Input type="number" step="0.001" placeholder="Ex: 0.5" {...field} />
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
                            placeholder={
                              selectedInvestmentType === "FII"
                                ? "Ex: MXRF11, HGLG11..."
                                : "Ex: IVVB11, BOVA11..."
                            }
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
                          <Input placeholder="Ex: Inter, XP, BTG..." {...field} />
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
                          <Input type="number" step="1" placeholder="Ex: 10" {...field} />
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
              name="is_reserve"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5 pr-4">
                    <FormLabel>Liquidez diária / reserva</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Dinheiro que continua líquido e disponível (ex.: CDB de
                      liquidez diária). Não conta como saída nem reduz o Saldo em
                      Conta do mês, mas segue no portfólio rendendo.
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : editing ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
