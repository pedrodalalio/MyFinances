import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, DollarSign, Calendar, TrendingUp, Pencil, Trash2 } from "lucide-react";
import { api } from "@/utils/api";

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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Badge } from "@/components/ui/badge";

const formatCurrency = (value: number): string => {
  return (Math.round(value * 100) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC"
  });
};

const formatDateForInput = (date: string): string => {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const salaryProfileSchema = z.object({
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Valor deve ser um número positivo",
  }),
  description: z.string().optional(),
  start_date: z.string().min(1, "Data de início é obrigatória"),
  end_date: z.string().optional(),
});

type SalaryProfileFormValues = z.infer<typeof salaryProfileSchema>;

interface SalaryProfile {
  id: string;
  amount: number;
  description?: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
}

interface CurrentSalary {
  currentSalary: SalaryProfile | null;
}

const SettingsPage = () => {
  const [salaryProfiles, setSalaryProfiles] = useState<SalaryProfile[]>([]);
  const [currentSalary, setCurrentSalary] = useState<SalaryProfile | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<SalaryProfile | null>(null);
  const [deletingProfileId, setDeletingProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Configurações | MyFinances";
    loadSalaryProfiles();
    loadCurrentSalary();
  }, []);

  const form = useForm<SalaryProfileFormValues>({
    resolver: zodResolver(salaryProfileSchema),
    defaultValues: {
      amount: "",
      description: "",
      start_date: "",
      end_date: "",
    },
  });

  const loadSalaryProfiles = async () => {
    try {
      const response = await api.get("/salary/profiles");
      setSalaryProfiles(response.data.salaryProfiles || []);
    } catch (error) {
      console.error("Erro ao carregar perfis salariais:", error);
    }
  };

  const loadCurrentSalary = async () => {
    try {
      const response = await api.get<CurrentSalary>("/salary/current");
      setCurrentSalary(response.data.currentSalary);
    } catch (error) {
      console.error("Erro ao carregar salário atual:", error);
    }
  };

  const openCreateDialog = () => {
    setEditingProfile(null);
    form.reset({
      amount: "",
      description: "",
      start_date: "",
      end_date: "",
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (profile: SalaryProfile) => {
    setEditingProfile(profile);
    form.reset({
      amount: String(profile.amount),
      description: profile.description || "",
      start_date: formatDateForInput(profile.start_date),
      end_date: profile.end_date ? formatDateForInput(profile.end_date) : "",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: SalaryProfileFormValues) => {
    setLoading(true);
    try {
      const requestBody = {
        amount: Math.round(parseFloat(values.amount) * 100) / 100,
        description: values.description,
        start_date: values.start_date,
        end_date: values.end_date || undefined,
      };

      if (editingProfile) {
        await api.put(`/salary/profiles/${editingProfile.id}`, requestBody);
      } else {
        await api.post("/salary/profiles", requestBody);
      }

      setIsDialogOpen(false);
      setEditingProfile(null);
      form.reset();
      loadSalaryProfiles();
      loadCurrentSalary();
    } catch (error) {
      console.error("Erro ao salvar perfil salarial:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingProfileId) return;
    setLoading(true);
    try {
      await api.delete(`/salary/profiles/${deletingProfileId}`);
      setDeletingProfileId(null);
      loadSalaryProfiles();
      loadCurrentSalary();
    } catch (error) {
      console.error("Erro ao apagar perfil salarial:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Conta"
        title="Configurações"
        description="Ajuste perfis salariais, preferências e dados da sua conta."
      />

      {/* Salário Atual */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              <CardTitle>Salário Atual</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {currentSalary ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-[color:var(--success)]">
                    R$ {formatCurrency(currentSalary.amount)}
                  </p>
                  {currentSalary.description && (
                    <p className="text-muted-foreground">{currentSalary.description}</p>
                  )}
                </div>
                <Badge variant="default">Ativo</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Início</p>
                  <p className="font-semibold">{formatDate(currentSalary.start_date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fim</p>
                  <p className="font-semibold">
                    {currentSalary.end_date ? formatDate(currentSalary.end_date) : "Indefinido"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum salário configurado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico Salarial */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              <CardTitle>Histórico Salarial</CardTitle>
            </div>

            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Definir Novo Salário
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {salaryProfiles.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum histórico encontrado</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Comece definindo seu primeiro perfil salarial.
                </p>
                <Button onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Definir Primeiro Salário
                </Button>
              </div>
            ) : (
              salaryProfiles.map((profile) => (
                <div
                  key={profile.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">
                        R$ {formatCurrency(profile.amount)}
                      </p>
                      {profile.description && (
                        <p className="text-sm text-muted-foreground">
                          {profile.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {profile.is_active && (
                        <Badge variant="default">Ativo</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(profile)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingProfileId(profile.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Início</p>
                      <p>{formatDate(profile.start_date)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Fim</p>
                      <p>
                        {profile.end_date ? formatDate(profile.end_date) : "Indefinido"}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Criar/Editar */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) setEditingProfile(null);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingProfile ? "Editar Salário" : "Definir Novo Salário"}
            </DialogTitle>
            <DialogDescription>
              {editingProfile
                ? "Altere os dados do perfil salarial."
                : "Configure um novo perfil salarial com período de vigência."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor do Salário</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="5000,00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ex: Promoção, Aumento anual..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Início</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Fim (opcional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <AlertDialog
        open={!!deletingProfileId}
        onOpenChange={(open) => { if (!open) setDeletingProfileId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar salário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja apagar este perfil salarial? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading}>
              {loading ? "Apagando..." : "Apagar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SettingsPage;
