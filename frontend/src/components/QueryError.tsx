import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QueryErrorProps {
  message?: string;
  onRetry?: () => void;
}

// Estado de erro padrão para o fetch inicial de uma página/painel,
// com botão de tentar de novo (refetch da query).
export default function QueryError({
  message = "Não foi possível carregar os dados.",
  onRetry,
}: QueryErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
      <AlertTriangle className="size-8 text-destructive" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw className="mr-2 size-4" />
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
