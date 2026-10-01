import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api";
import { makeCrudHooks } from "@/hooks/use-crud";
import { invoicesApi } from "../services/invoices.api";
import { paymentsApi } from "../../payments/services/payments.api";
import type { Invoice } from "../types";

const crud = makeCrudHooks<Invoice>(invoicesApi, { queryKey: "invoices", entityName: "Invoice" });

export const { useList, useDetail, useCreate, useUpdate, useDelete, useAction, useInvalidate } = crud;

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["invoices"] });
  qc.invalidateQueries({ queryKey: ["payments"] });
  qc.invalidateQueries({ queryKey: ["bookings"] });
}

export function useAddItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, data }: { invoiceId: string; data: any }) =>
      invoicesApi.addItem(invoiceId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, itemId, data }: { invoiceId: string; itemId: string; data: any }) =>
      invoicesApi.updateItem(invoiceId, itemId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, itemId }: { invoiceId: string; itemId: string }) =>
      invoicesApi.deleteItem(invoiceId, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

/** Records a payment against an invoice (payments module endpoint). */
export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => paymentsApi.create(data),
    onSuccess: () => {
      toast.success("Payment recorded");
      invalidateAll(qc);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}
