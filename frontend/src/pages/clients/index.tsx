import { useEffect } from "react";
import { Users, Construction } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";

const ClientsPage = () => {
  useEffect(() => {
    document.title = "Clientes | MyFinances";
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operações"
        title="Clientes"
        description="Gerencie clientes e cobranças vinculadas às suas operações."
      />

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Construction className="size-7" />
          </span>
          <h3 className="mt-5 font-display text-xl font-bold tracking-tight">
            Em construção
          </h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Logo você poderá cadastrar clientes, emitir cobranças e acompanhar
            recebíveis direto por aqui.
          </p>
          <div className="mt-6 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            <Users className="size-3.5" /> Módulo em desenvolvimento
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientsPage;
