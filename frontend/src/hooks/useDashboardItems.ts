import { Home, Settings, CreditCard, Calendar, Wallet, TrendingUp, FileText, ArrowDownLeft, Upload } from "lucide-react";

interface DashboardItem {
  title: string;
  url: string;
  icon: React.ComponentType<any>;
  badge?: string;
}

const useDashboardItems = (): DashboardItem[] => {
  return [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
    },
    {
      title: "Cartões",
      url: "/cards",
      icon: CreditCard,
    },
    {
      title: "Gastos",
      url: "/expenses",
      icon: Wallet,
    },
    {
      title: "Entradas",
      url: "/incomes",
      icon: ArrowDownLeft,
    },
    {
      title: "Investimentos",
      url: "/investments",
      icon: TrendingUp,
    },
    {
      title: "Impostos",
      url: "/taxes",
      icon: FileText,
    },
    {
      title: "Importações",
      url: "/imports",
      icon: Upload,
    },
    {
      title: "Fechamento",
      url: "/monthly-tracking",
      icon: Calendar,
    },
    {
      title: "Configurações",
      url: "/settings",
      icon: Settings,
    },
  ];
};

export default useDashboardItems;