import { useEffect } from "react";
import Header from "./Header";
import Statistics from "./Statistics";
import InvestmentGrowthCharts from "@/components/InvestmentGrowthCharts";
import { FiiIncomeCard } from "@/components/FiiIncomeCard";

const Default = () => {
  useEffect(() => {
    document.title = "Dashboard | MyFinances";
  }, []);

  return (
    <div className="space-y-6">
      <Header />
      <Statistics />
      <FiiIncomeCard />
      <InvestmentGrowthCharts />
    </div>
  );
};

export default Default;
