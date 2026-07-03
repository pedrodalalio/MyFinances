import { useQuery } from "@tanstack/react-query";
import { api } from "@/utils/api";
import { queryKeys } from "@/lib/query";

// Compartilha a key (e o formato: array) com useMaturedInvestmentsQuery da
// página de investimentos — o cache é um só, então o queryFn PRECISA retornar
// a mesma coisa nos dois lugares. A contagem é derivada via select.
export default function useMaturedInvestmentsCount() {
  const { data: count = 0 } = useQuery({
    queryKey: queryKeys.maturedInvestments,
    queryFn: async (): Promise<unknown[]> => {
      const res = await api.get("/investments/matured");
      return res.data.investments || [];
    },
    select: (investments) => investments.length,
  });

  return count;
}
