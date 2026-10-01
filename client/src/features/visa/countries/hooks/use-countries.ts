import { useQueryClient } from "@tanstack/react-query";
import { makeCrudHooks } from "@/hooks/use-crud";
import { countriesApi } from "../services/countries.api";
import type { Country } from "../types";

const crud = makeCrudHooks<Country>(countriesApi, { queryKey: "countries", entityName: "Country" });

export const { useList, useDetail, useCreate, useUpdate, useDelete } = crud;

/** Country edits also feed the reference hook used across dropdowns. */
export function useInvalidateCountryReference() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["reference", "countries"] });
  };
}
