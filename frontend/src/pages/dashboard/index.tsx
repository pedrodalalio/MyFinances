import React, { useEffect } from "react";
import Header from "./Header";
import Statistics from "./Statistics";

const Default = () => {
  useEffect(() => {
    document.title = "Dashboard | MyFinances";
  }, []);

  return (
    <div className="space-y-6">
      <Header />
      <Statistics />
    </div>
  );
};

export default Default;
