import { makeCrudHooks } from "@/hooks/use-crud";
import { leadsApi } from "../services/leads.api";
import type { Lead } from "../types";

const crud = makeCrudHooks<Lead>(leadsApi, { queryKey: "leads", entityName: "Lead" });

export const { useList, useDetail, useCreate, useUpdate, useDelete, useInvalidate } = crud;

export function useConvertLead() {
  return crud.useAction((id) => leadsApi.convert(id), "Lead converted to customer");
}

export function useLoseLead() {
  return crud.useAction((id, body) => leadsApi.lose(id, body), "Lead marked as lost");
}
