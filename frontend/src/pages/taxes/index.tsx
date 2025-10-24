import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, FileText, Trash2, Edit, Calendar, Clock } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const months = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - 2 + i);

const taxTypes = [
  { value: "MEI", label: "MEI (Microempreendedor Individual)" },
  { value: "IRPF", label: "Imposto de Renda Pessoa Física" },
  { value: "IPVA", label: "IPVA (Veículo)" },
  { value: "IPTU", label: "IPTU (Imóvel)" },
  { value: "ISS", label: "ISS (Serviços)" },
  { value: "ICMS", label: "ICMS (Mercadorias)" },
  { value: "COFINS", label: "COFINS" },
  { value: "PIS", label: "PIS" },
  { value: "CSLL", label: "CSLL" },
  { value: "MUNICIPAL", label: "Taxa Municipal" },
  { value: "ESTADUAL", label: "Taxa Estadual" },
  { value: "FEDERAL", label: "Taxa Federal" },
  { value: "OTHER", label: "Outro" },
];

const taxFrequencies = [
  { value: "MONTHLY", label: "Mensal" },
  { value: "QUARTERLY", label: "Trimestral" },
  { value: "SEMI_ANNUAL", label: "Semestral" },
  { value: "ANNUAL", label: "Anual" },
  { value: "ONE_TIME", label: "Único" },
];

const paymentMethods = [
  { value: "PIX", label: "PIX" },
  { value: "BANK_SLIP", label: "Boleto Bancário" },
  { value: "DEBIT_CARD", label: "Cartão de Débito" },
  { value: "BANK_TRANSFER", label: "Transferência Bancária" },
  { value: "ONLINE_PAYMENT", label: "Pagamento Online" },
  { value: "OTHER", label: "Outro" },
];

const formatCurrency = (value: number): string => {
  return (Math.round(value * 100) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("pt-BR");
};

const taxSchema = z.object({
  description: z.string().optional(),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Valor deve ser um número positivo",
  }),
  tax_type: z.string().min(1, "Tipo de imposto é obrigatório"),
  frequency: z.string().min(1, "Frequência é obrigatória"),
  payment_method: z.string().min(1, "Método de pagamento é obrigatório"),
  due_date: z.string().refine((val) => {
    const num = parseInt(val);
    return !isNaN(num) && num >= 1 && num <= 31;
  }, {
    message: "Dia deve ser entre 1 e 31",
  }),
  month: z.string().min(1, "Mês é obrigatório"),
  year: z.string().min(1, "Ano é obrigatório"),
});

type TaxFormValues = z.infer<typeof taxSchema>;

interface Tax {
  id: string;
  tax_type: string;
  amount: number;
  payment_method: string;
  frequency: string;
  day_of_month: number;
  month: string;
  year: number;
  due_date: string;
  created_at: string;
}

const TaxesPage = () => {
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingTax, setEditingTax] = useState<Tax | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    document.title = "Impostos | MyFinances";
    loadTaxes();
  }, [selectedMonth, selectedYear]);

  const form = useForm<TaxFormValues>({
    resolver: zodResolver(taxSchema),
    defaultValues: {
      description: "",
      amount: "",
      tax_type: "MEI",
      frequency: "MONTHLY",
      payment_method: "PIX",
      due_date: "",
      month: selectedMonth.toString().padStart(2, "0"),
      year: selectedYear.toString(),
    },
  });

  const loadTaxes = async () => {
    try {
      const month = selectedMonth.toString().padStart(2, "0");
      const response = await api.get(`/taxes/${month}/${selectedYear}`);
      setTaxes(response.data.taxes || []);
    } catch (error) {
      console.error("Erro ao carregar impostos:", error);
    }
  };

  const onSubmit = async (values: TaxFormValues) => {
    if (editingTax) {
      await updateTax(values);
    } else {
      await createTax(values);
    }
  };

  const generateTaxName = (taxType: string, month: string, year: string) => {
    const taxTypeLabel = getTaxTypeLabel(taxType);
    const monthLabel = months.find(m => m.value === month)?.label || month;
    return `${taxTypeLabel} - ${monthLabel} ${year}`;
  };

  const createDueDate = (day: string, month: string, year: string) => {
    const formattedDay = day.padStart(2, '0');
    const formattedMonth = month.padStart(2, '0');
    return `${year}-${formattedMonth}-${formattedDay}`;
  };

  const createTax = async (values: TaxFormValues) => {
    setLoading(true);
    try {
      if (values.frequency === "MONTHLY") {
        // Para frequência mensal, criar para todos os meses até o fim do ano
        const startMonth = parseInt(values.month);
        const year = parseInt(values.year);
        const requests = [];

        for (let month = startMonth; month <= 12; month++) {
          const monthStr = month.toString().padStart(2, "0");
          const requestBody = {
            name: generateTaxName(values.tax_type, monthStr, values.year),
            description: values.description,
            amount: Math.round(parseFloat(values.amount) * 100) / 100,
            tax_type: values.tax_type,
            frequency: values.frequency,
            payment_method: values.payment_method,
            day_of_month: parseInt(values.due_date),
            due_date: createDueDate(values.due_date, monthStr, values.year),
            month: monthStr,
            year: year,
          };
          requests.push(api.post("/taxes", requestBody));
        }

        await Promise.all(requests);
      } else {
        // Para outras frequências, criar apenas um registro
        const requestBody = {
          name: generateTaxName(values.tax_type, values.month, values.year),
          description: values.description,
          amount: Math.round(parseFloat(values.amount) * 100) / 100,
          tax_type: values.tax_type,
          frequency: values.frequency,
          payment_method: values.payment_method,
          day_of_month: parseInt(values.due_date),
          due_date: createDueDate(values.due_date, values.month, values.year),
          month: values.month,
          year: parseInt(values.year),
        };

        await api.post("/taxes", requestBody);
      }

      setIsDialogOpen(false);
      form.reset();
      loadTaxes();
    } catch (error) {
      console.error("Erro ao criar imposto:", error);
    } finally {
      setLoading(false);
    }
  };

  const editTax = (tax: Tax) => {
    setEditingTax(tax);

    form.reset({
      description: "",
      amount: tax.amount.toFixed(2),
      tax_type: tax.tax_type,
      frequency: tax.frequency,
      payment_method: tax.payment_method,
      due_date: tax.day_of_month.toString(),
      month: tax.month,
      year: tax.year.toString(),
    });
    setIsDialogOpen(true);
  };

  const updateTax = async (values: TaxFormValues) => {
    if (!editingTax) return;

    setLoading(true);
    try {
      const requestBody = {
        name: generateTaxName(values.tax_type, values.month, values.year),
        description: values.description,
        amount: Math.round(parseFloat(values.amount) * 100) / 100,
        tax_type: values.tax_type,
        frequency: values.frequency,
        payment_method: values.payment_method,
        day_of_month: parseInt(values.due_date),
        due_date: createDueDate(values.due_date, values.month, values.year),
        month: values.month,
        year: parseInt(values.year),
      };

      await api.put(`/taxes/${editingTax.id}`, requestBody);
      setIsDialogOpen(false);
      setEditingTax(null);
      form.reset();
      loadTaxes();
    } catch (error) {
      console.error("Erro ao atualizar imposto:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteTax = async (id: string) => {
    try {
      await api.delete(`/taxes/${id}`);
      loadTaxes();
    } catch (error) {
      console.error("Erro ao deletar imposto:", error);
    }
  };


  const getTaxTypeLabel = (type: string) => {
    const taxType = taxTypes.find((t) => t.value === type);
    return taxType ? taxType.label : type;
  };

  const getFrequencyLabel = (frequency: string) => {
    const freq = taxFrequencies.find((f) => f.value === frequency);
    return freq ? freq.label : frequency;
  };

  const getPaymentMethodLabel = (method: string) => {
    const paymentMethod = paymentMethods.find((p) => p.value === method);
    return paymentMethod ? paymentMethod.label : method;
  };

  const totalTaxes = taxes.reduce((sum, tax) => sum + tax.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Impostos e Taxas</h1>
          <p className="text-muted-foreground">
            Gerencie impostos, taxas e obrigações fiscais
          </p>
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingTax(null);
              form.reset();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Imposto
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTax ? "Editar Imposto" : "Adicionar Imposto"}
              </DialogTitle>
              <DialogDescription>
                {editingTax
                  ? "Edite as informações do imposto."
                  : "Adicione um novo imposto ou taxa."}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="tax_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Imposto</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione o tipo de imposto" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {taxTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frequência</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione a frequência" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {taxFrequencies.map((freq) => (
                            <SelectItem key={freq.value} value={freq.value}>
                              {freq.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.watch("frequency") === "MONTHLY" && (
                        <div className="text-sm text-blue-600 mt-1">
                          💡 Frequência mensal criará automaticamente este imposto para todos os meses até dezembro do ano selecionado.
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-4">
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
                              placeholder="Ex: 66,60"
                              className="w-full"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="col-span-4">
                    <FormField
                      control={form.control}
                      name="due_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dia do Vencimento</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="31"
                              placeholder="Ex: 20"
                              className="w-full"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="col-span-4">
                    <FormField
                      control={form.control}
                      name="payment_method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Forma de Pagamento</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecione a forma de pagamento" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {paymentMethods.map((method) => (
                                <SelectItem
                                  key={method.value}
                                  value={method.value}
                                >
                                  {method.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-6">
                    <FormField
                      control={form.control}
                      name="month"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mês</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecione o mês" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {months.map((month) => (
                                <SelectItem
                                  key={month.value}
                                  value={month.value}
                                >
                                  {month.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="col-span-6">
                    <FormField
                      control={form.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ano</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecione o ano" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {years.map((year) => (
                                <SelectItem key={year} value={year.toString()}>
                                  {year}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição (opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Detalhes sobre o imposto..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingTax(null);
                      form.reset();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading
                      ? editingTax
                        ? "Atualizando..."
                        : "Salvando..."
                      : editingTax
                        ? "Atualizar"
                        : "Salvar"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Resumo */}
      <div className="grid gap-4 md:grid-cols-1">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Impostos
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {formatCurrency(totalTaxes)}
            </div>
            <p className="text-xs text-muted-foreground">
              {taxes.length} imposto(s) cadastrado(s)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div>
              <label className="text-sm font-medium">Mês:</label>
              <Select
                value={selectedMonth.toString().padStart(2, "0")}
                onValueChange={(value) => setSelectedMonth(parseInt(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Ano:</label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger className="w-24">
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
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {taxes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Nenhum imposto cadastrado
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                Comece adicionando seus impostos e taxas para manter o controle
                fiscal.
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Primeiro Imposto
              </Button>
            </CardContent>
          </Card>
        ) : (
          taxes.map((tax) => (
            <Card key={tax.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {getTaxTypeLabel(tax.tax_type)} - {new Date(tax.due_date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => editTax(tax)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTax(tax.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Valor</p>
                    <p className="font-semibold">
                      R$ {formatCurrency(tax.amount)}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Vencimento</p>
                    <p className="font-semibold">{formatDate(tax.due_date)}</p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Tipo</p>
                    <p className="font-semibold">
                      {getTaxTypeLabel(tax.tax_type)}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Frequência</p>
                    <p className="font-semibold">
                      {getFrequencyLabel(tax.frequency)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {getTaxTypeLabel(tax.tax_type)}
                  </Badge>
                  <Badge variant="secondary">
                    {getFrequencyLabel(tax.frequency)}
                  </Badge>
                  <Badge variant="outline">
                    {getPaymentMethodLabel(tax.payment_method)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default TaxesPage;
