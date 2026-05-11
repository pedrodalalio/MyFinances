import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import useAuth from "@/hooks/useAuth";

const Header = () => {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] || "Usuário";

  const now = new Date();
  const monthLabel = now
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    .replace(/^./, (c) => c.toUpperCase());

  return (
    <PageHeader
      eyebrow="Visão geral"
      title={`Olá, ${firstName}.`}
      description="Acompanhe entradas, saídas e investimentos do mês em um só lugar."
      action={
        <Badge
          variant="outline"
          className="border-primary/30 bg-primary/5 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-primary"
        >
          {monthLabel}
        </Badge>
      }
    />
  );
};

export default Header;
