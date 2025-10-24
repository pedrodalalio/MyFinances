import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Page404 = () => {
  useEffect(() => {
    document.title = "404 - Página não encontrada | MyFinances";
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-8xl font-bold text-muted-foreground">404</h1>
          <h2 className="text-2xl font-semibold">Página não encontrada!</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Não foi possível visualizar a página ou ela foi removida!
          </p>
        </div>
        <Link to="/">
          <Button size="lg">
            Voltar ao início
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Page404;
