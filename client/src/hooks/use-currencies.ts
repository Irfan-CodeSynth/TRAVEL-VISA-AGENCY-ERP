import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchangeRate: string | number;
  isDefault: boolean;
  isActive: boolean;
}

export function useCurrencies() {
  return useQuery<Currency[]>({
    queryKey: ["currencies"],
    queryFn: () => apiGet<Currency[]>("/currencies"),
    staleTime: 1000 * 60 * 30,
  });
}
