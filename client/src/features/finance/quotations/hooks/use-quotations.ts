import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api";
import { makeCrudHooks } from "@/hooks/use-crud";
import { quotationsApi } from "../services/quotations.api";
import type { Quotation } from "../types";

const crud = makeCrudHooks<Quotation>(quotationsApi, { queryKey: "quotations", entityName: "Quotation" });

export const { useList, useDetail, useCreate, useUpdate, useDelete, useAction, useInvalidate } = crud;

export function useConvert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => quotationsApi.convert(id),
    onSuccess: () => {
      toast.success("Quotation converted to invoice");
      qc.invalidateQueries({ queryKey: ["quotations"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

export function useAddItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ quotationId, data }: { quotationId: string; data: any }) =>
      quotationsApi.addItem(quotationId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotations"] }),
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ quotationId, itemId, data }: { quotationId: string; itemId: string; data: any }) =>
      quotationsApi.updateItem(quotationId, itemId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotations"] }),
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ quotationId, itemId }: { quotationId: string; itemId: string }) =>
      quotationsApi.deleteItem(quotationId, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotations"] }),
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}
