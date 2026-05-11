import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";

const Page500 = () => {
  useEffect(() => {
    document.title = "500 — Erro do servidor | MyFinances";
  }, []);

  return (
    <AuthShell
      eyebrow="Erro 500"
      title="Algo deu errado"
      subtitle="O servidor encontrou um problema inesperado. Tente novamente em alguns minutos."
    >
      <div className="flex flex-col items-center gap-4">
        <p className="font-display text-7xl font-bold tabular text-destructive">
          500
        </p>
        <Link to="/">
          <Button size="lg" className="gap-2">
            <ArrowLeft className="size-4" />
            Voltar ao início
          </Button>
        </Link>
      </div>
    </AuthShell>
  );
};

export default Page500;
