import { useQueryClient } from "@tanstack/react-query";
import { makeCrudHooks } from "@/hooks/use-crud";
import { visaTypesApi } from "../services/visa-types.api";
import type { VisaType } from "../types";

const crud = makeCrudHooks<VisaType>(visaTypesApi, { queryKey: "visa-types", entityName: "Visa type" });

export const { useList, useDetail, useCreate, useUpdate, useDelete } = crud;

/** Visa-type edits also feed the reference hook used in application dialogs. */
export function useInvalidateVisaTypeReference() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["reference", "visaTypes"] });
  };
}
