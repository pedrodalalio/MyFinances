import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { TrendingUp } from "lucide-react";
import { api } from "@/utils/api";

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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const updateValueSchema = z.object({
  current_value: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Valor atual deve ser um número positivo",
  }),
  notes: z.string().optional(),
});

type UpdateValueFormValues = z.infer<typeof updateValueSchema>;

interface Asset {
  id: string;
  name: string;
  current_value: number;
}

interface UpdateAssetValueDialogProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const formatCurrency = (value: number): string => {
  return (Math.round(value * 100) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

export const UpdateAssetValueDialog: React.FC<UpdateAssetValueDialogProps> = ({
  asset,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);

  const form = useForm<UpdateValueFormValues>({
    resolver: zodResolver(updateValueSchema),
    defaultValues: {
      current_value: asset?.current_value.toString() || "",
      notes: "",
    },
  });

  React.useEffect(() => {
    if (asset) {
      form.reset({
        current_value: asset.current_value.toString(),
        notes: "",
      });
    }
  }, [asset, form]);

  const onSubmit = async (values: UpdateValueFormValues) => {
    if (!asset) return;

    setLoading(true);
    try {
      const requestBody = {
        current_value: parseFloat(values.current_value),
        notes: values.notes,
      };

      await api.patch(`/portfolio/assets/${asset.id}/value`, requestBody);
      onSuccess();
      onClose();
      form.reset();
    } catch (error) {
      console.error("Erro ao atualizar valor do ativo:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    form.reset();
  };

  if (!asset) return null;

  const currentValue = parseFloat(form.watch("current_value") || "0");
  const difference = currentValue - asset.current_value;
  const percentageChange = asset.current_value > 0 ? (difference / asset.current_value) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Atualizar Valor
          </DialogTitle>
          <DialogDescription>
            Atualize o valor atual de <strong>{asset.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Valor atual e comparação */}
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Valor Atual</span>
              <span className="font-medium">{formatCurrency(asset.current_value)}</span>
            </div>

            {difference !== 0 && (
              <>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Novo Valor</span>
                  <span className="font-medium">{formatCurrency(currentValue)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Variação</span>
                  <div className="text-right">
                    <div className={`font-medium ${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {difference >= 0 ? '+' : ''}{formatCurrency(difference)}
                    </div>
                    <div className={`text-xs ${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {difference >= 0 ? '+' : ''}{percentageChange.toFixed(2)}%
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="current_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Novo Valor Atual</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ex: Atualização mensal, rendimento de juros..."
                        className="min-h-[80px]"
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
                  onClick={handleClose}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Atualizando..." : "Atualizar Valor"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};