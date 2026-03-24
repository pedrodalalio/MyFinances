import { Home, Settings, CreditCard, Calendar, Wallet, TrendingUp, FileText, PieChart } from "lucide-react";

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