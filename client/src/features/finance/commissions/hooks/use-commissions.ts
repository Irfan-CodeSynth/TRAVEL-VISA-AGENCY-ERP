import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api";
import { makeCrudHooks } from "@/hooks/use-crud";
import { commissionsApi } from "../services/commissions.api";
import type { Commission } from "../types";

const crud = makeCrudHooks<Commission>(commissionsApi, { queryKey: "commissions", entityName: "Commission" });

export const { useList, useDetail, useCreate, useDelete, useAction, useInvalidate } = crud;

export function useGenerateCommission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { bookingId: string; agentId: string }) => commissionsApi.generate(body),
    onSuccess: () => {
      toast.success("Commission generated from booking");
      qc.invalidateQueries({ queryKey: ["commissions"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}
