import { useEffect, useState } from "react";
import { api } from "@/utils/api";

export default function useMaturedInvestmentsCount() {
  const [count, setCount] = useState(0);

  const fetchCount = async () => {
    try {
      const res = await api.get("/investments/matured");
      setCount(res.data.investments?.length ?? 0);
    } catch (err) {
      console.error("Erro ao carregar vencidos:", err);
    }
  };

  useEffect(() => {
    fetchCount();
    const handler = () => fetchCount();
    window.addEventListener("matured-updated", handler);
    window.addEventListener("balance-updated", handler);
    return () => {
      window.removeEventListener("matured-updated", handler);
      window.removeEventListener("balance-updated", handler);
    };
  }, []);

  return count;
}
