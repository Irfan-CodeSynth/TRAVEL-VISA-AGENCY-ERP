import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api";
import { makeCrudHooks } from "@/hooks/use-crud";
import { paymentsApi } from "../services/payments.api";
import type { Payment } from "../types";

const crud = makeCrudHooks<Payment>(paymentsApi, { queryKey: "payments", entityName: "Payment" });

export const { useList, useDetail, useCreate, useDelete, useAction, useInvalidate } = crud;

function invalidateFinance(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["payments"] });
  qc.invalidateQueries({ queryKey: ["invoices"] });
  qc.invalidateQueries({ queryKey: ["bookings"] });
}

export function useConfirmPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => paymentsApi.confirm(id),
    onSuccess: () => {
      toast.success("Payment confirmed");
      invalidateFinance(qc);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

export function useFailPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => paymentsApi.fail(id),
    onSuccess: () => {
      toast.success("Payment marked failed");
      invalidateFinance(qc);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

export function useRefundPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount?: number }) =>
      paymentsApi.refund(id, amount !== undefined ? { amount } : {}),
    onSuccess: () => {
      toast.success("Refund recorded");
      invalidateFinance(qc);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}
