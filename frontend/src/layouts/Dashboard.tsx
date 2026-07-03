import React, { Suspense } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LogOut, Sun, Moon, ChevronsLeft, Menu } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { Brand } from "@/components/Brand";
import useDashboardItems from "../hooks/useDashboardItems";
import useAuth from "../hooks/useAuth";
import useMaturedInvestmentsCount from "../hooks/useMaturedInvestmentsCount";
import { useTheme } from "../contexts/ThemeContext";
import BalanceSummary from "../components/BalanceSummary";
import { cn } from "@/lib/utils";

const NAV_GROUPS = [
  {
    label: "Visão geral",
    keys: ["Dashboard", "Cartões", "Gastos", "Entradas"],
  },
  {
    label: "Operações",
    keys: ["Investimentos", "Impostos", "Importações", "Fechamento"],
  },
  {
    label: "Conta",
    keys: ["Configurações"],
  },
];

const SidebarNav = ({
  onNavigate,
}: {
  onNavigate?: () => void;
}) => {
  const dashboardItems = useDashboardItems();
  const maturedCount = useMaturedInvestmentsCount();

  const itemMap = new Map(dashboardItems.map((i) => [i.title, i]));

  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-2">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {group.label}
          </p>
          <ul className="flex flex-col gap-0.5">
            {group.keys.map((key) => {
              const item = itemMap.get(key);
              if (!item) return null;
              const Icon = item.icon;
              const showBadge =
                item.url === "/investments" && maturedCount > 0;
              return (
                <li key={item.title}>
                  <NavLink
                    to={item.url}
                    end
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={cn(
                            "flex size-7 items-center justify-center rounded-md transition-colors",
                            isActive
                              ? "bg-primary/15 text-primary"
                              : "text-muted-foreground group-hover:text-foreground",
                          )}
                        >
                          <Icon className="size-4" />
                        </span>
                        <span className="flex-1 truncate">{item.title}</span>
                        {showBadge && (
                          <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[color:var(--warning)] px-1.5 text-[10px] font-bold text-[color:var(--warning-foreground)] tabular">
                            {maturedCount}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
};

const UserMenuTrigger = () => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex w-full items-center gap-3 rounded-lg border border-border bg-card/40 p-2.5 text-left transition-colors hover:bg-accent/60"
          aria-label="Menu do usuário"
        >
          <Avatar className="size-9">
            <AvatarImage src={user?.avatar} alt={user?.name} />
            <AvatarFallback className="bg-primary/15 font-display text-sm font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {user?.name || "Usuário"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.email || "—"}
            </p>
          </div>
          <ChevronsLeft className="size-4 rotate-180 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="text-xs text-muted-foreground">Sessão</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/settings")}>
          Configurações
        </DropdownMenuItem>
        <DropdownMenuItem onClick={toggleTheme}>
          {theme === "light" ? (
            <Moon className="mr-2 size-4" />
          ) : (
            <Sun className="mr-2 size-4" />
          )}
          {theme === "light" ? "Tema escuro" : "Tema claro"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
          <LogOut className="mr-2 size-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const DesktopSidebar = () => (
  <aside className="hidden md:flex md:flex-col md:w-64 md:shrink-0 md:border-r md:border-sidebar-border md:bg-sidebar">
    <div className="flex h-16 items-center px-5">
      <Brand />
    </div>
    <SidebarNav />
    <div className="px-3 py-4">
      <UserMenuTrigger />
    </div>
  </aside>
);

const MobileNavSheet = () => {
  const [open, setOpen] = React.useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 bg-sidebar p-0">
        <SheetHeader className="px-5 pt-5">
          <SheetTitle className="text-left">
            <Brand />
          </SheetTitle>
          <SheetDescription className="sr-only">
            Navegação principal
          </SheetDescription>
        </SheetHeader>
        <SidebarNav onNavigate={() => setOpen(false)} />
        <div className="px-3 py-4">
          <UserMenuTrigger />
        </div>
      </SheetContent>
    </Sheet>
  );
};

const TopBar = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:px-6">
      <MobileNavSheet />
      <div className="md:hidden">
        <Brand showText={false} />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden sm:block">
          <BalanceSummary />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Alternar tema"
        >
          {theme === "light" ? (
            <Moon className="size-4" />
          ) : (
            <Sun className="size-4" />
          )}
        </Button>
      </div>
    </header>
  );
};

const Dashboard = ({ children }: { children?: React.ReactNode }) => {
  return (
    <div className="flex min-h-dvh">
      <DesktopSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 pb-10">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
            <Suspense
              fallback={
                <div className="space-y-4">
                  <Skeleton className="h-10 w-72" />
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                  </div>
                  <Skeleton className="h-64 w-full" />
                </div>
              }
            >
              {children}
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
