import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { makeCrudHooks } from "@/hooks/use-crud";
import { apiErrorMessage } from "@/lib/api";
import { faresApi, type MarginDefault } from "../services/fares.api";
import type { FlightFare } from "../types";

const crud = makeCrudHooks<FlightFare>(faresApi, { queryKey: "flightFares", entityName: "Fare" });

export const { useList, useDetail, useCreate, useUpdate, useDelete } = crud;

export function useFareSearch(params: {
  enabled: boolean;
  fromCode?: string;
  toCode?: string;
  date?: string;
  cabinClass?: string;
  pax?: number;
}) {
  const { enabled, ...rest } = params;
  return useQuery({
    queryKey: ["flightFares", "search", rest],
    queryFn: () => faresApi.search(rest),
    enabled,
  });
}

export function useGlobalMarginDefault(enabled: boolean) {
  return useQuery({
    queryKey: ["flightFares", "globalMarginDefault"],
    queryFn: () => faresApi.globalMarginDefault(),
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}

export function useSetGlobalMarginDefault() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (margin: MarginDefault | null) => faresApi.setGlobalMarginDefault(margin),
    onSuccess: () => {
      toast.success("Default margin saved");
      qc.invalidateQueries({ queryKey: ["flightFares", "globalMarginDefault"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}
