import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";

const Page404 = () => {
  useEffect(() => {
    document.title = "404 — Página não encontrada | MyFinances";
  }, []);

  return (
    <AuthShell
      eyebrow="Erro 404"
      title="Página não encontrada"
      subtitle="O endereço que você acessou não existe ou foi movido. Verifique o link e tente novamente."
    >
      <div className="flex flex-col items-center gap-4">
        <p className="font-display text-7xl font-bold tabular text-primary">
          404
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

export default Page404;
