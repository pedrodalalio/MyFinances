import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  emphasis?: "default" | "primary" | "success" | "warning" | "destructive";
  trend?: "up" | "down" | "neutral";
  className?: string;
}

const emphasisStyles: Record<NonNullable<StatCardProps["emphasis"]>, string> = {
  default: "",
  primary: "border-primary/30 bg-primary/5",
  success: "border-[color:var(--success)]/30 bg-[color:var(--success)]/5",
  warning: "border-[color:var(--warning)]/30 bg-[color:var(--warning)]/5",
  destructive: "border-destructive/30 bg-destructive/5",
};

const emphasisIconStyles: Record<NonNullable<StatCardProps["emphasis"]>, string> = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/15 text-primary",
  success:
    "bg-[color:var(--success)]/15 text-[color:var(--success)]",
  warning:
    "bg-[color:var(--warning)]/15 text-[color:var(--warning)]",
  destructive: "bg-destructive/15 text-destructive",
};

const emphasisValueStyles: Record<NonNullable<StatCardProps["emphasis"]>, string> = {
  default: "",
  primary: "text-primary",
  success: "text-[color:var(--success)]",
  warning: "text-[color:var(--warning)]",
  destructive: "text-destructive",
};

export function StatCard({
  label,
  value,
  unit,
  hint,
  icon: Icon,
  emphasis = "default",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-colors",
        emphasisStyles[emphasis],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {label}
        </p>
        {Icon && (
          <span
            className={cn(
              "grid size-8 place-items-center rounded-md",
              emphasisIconStyles[emphasis],
            )}
          >
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-display text-3xl font-bold tracking-tight tabular md:text-4xl",
            emphasisValueStyles[emphasis],
          )}
        >
          {value}
        </span>
        {unit && (
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
      {hint && <div className="mt-2 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
