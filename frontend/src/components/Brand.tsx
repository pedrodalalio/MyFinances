import { cn } from "@/lib/utils";

interface BrandProps {
  className?: string;
  showText?: boolean;
}

export function Brand({ className, showText = true }: BrandProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <BrandMark />
      {showText && (
        <span className="font-display text-base font-bold tracking-tight">
          My<span className="text-primary">Finances</span>
        </span>
      )}
    </div>
  );
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("size-8", className)}
      fill="none"
      aria-hidden
    >
      <rect
        width="64"
        height="64"
        rx="14"
        fill="currentColor"
        className="text-foreground/5"
      />
      {/* Gráfico de barras crescentes */}
      <rect x="14" y="36" width="6" height="14" rx="1.5" className="fill-primary/55" />
      <rect x="24" y="28" width="6" height="22" rx="1.5" className="fill-primary/75" />
      <rect x="34" y="20" width="6" height="30" rx="1.5" className="fill-primary" />
      {/* Seta de tendência */}
      <path
        d="M14 32 L26 22 L36 26 L50 14"
        className="stroke-foreground"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="50" cy="14" r="3" className="fill-primary" />
    </svg>
  );
}
