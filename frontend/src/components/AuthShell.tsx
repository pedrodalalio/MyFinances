import { Brand } from "@/components/Brand";
import { cn } from "@/lib/utils";

interface AuthShellProps {
  children: React.ReactNode;
  eyebrow?: string;
  title: string;
  subtitle?: string;
}

export function AuthShell({
  children,
  eyebrow,
  title,
  subtitle,
}: AuthShellProps) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-10">
      <BackgroundDecoration />
      <div className="relative w-full max-w-md">
        <div className="mb-6">
          <Brand />
        </div>
        <div className="mb-8 flex flex-col items-start gap-2 text-left">
          {eyebrow && (
            <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary">
              {eyebrow}
            </span>
          )}
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground md:text-base">
              {subtitle}
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-border/80 bg-card/60 p-6 backdrop-blur-md md:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

function BackgroundDecoration() {
  return (
    <>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0",
          "bg-[radial-gradient(circle_at_85%_-10%,oklch(0.78_0.16_160/0.22),transparent_55%),radial-gradient(circle_at_-10%_110%,oklch(0.65_0.16_220/0.16),transparent_55%)]",
        )}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(to_right,oklch(0.96_0.003_160)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.96_0.003_160)_1px,transparent_1px)] [background-size:48px_48px]"
      />
    </>
  );
}
