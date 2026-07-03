import { useQuery } from "@tanstack/react-query";
import { api } from "@/utils/api";
import { queryKeys } from "@/lib/query";

export default function useMaturedInvestmentsCount() {
  const { data: count = 0 } = useQuery({
    queryKey: queryKeys.maturedInvestments,
    queryFn: async () => {
      const res = await api.get("/investments/matured");
      return res.data.investments?.length ?? 0;
    },
  });

  return count;
}
