import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api";
import { makeCrudHooks } from "@/hooks/use-crud";
import { bookingsApi } from "../services/bookings.api";
import type { Booking } from "../types";

const crud = makeCrudHooks<Booking>(bookingsApi, { queryKey: "bookings", entityName: "Booking" });

export const { useList, useDetail, useCreate, useUpdate, useDelete, useAction, useInvalidate } = crud;

export function useAddItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, data }: { bookingId: string; data: any }) =>
      bookingsApi.addItem(bookingId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, itemId, data }: { bookingId: string; itemId: string; data: any }) =>
      bookingsApi.updateItem(bookingId, itemId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, itemId }: { bookingId: string; itemId: string }) =>
      bookingsApi.deleteItem(bookingId, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}
