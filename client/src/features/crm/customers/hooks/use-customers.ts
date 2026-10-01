import { useQuery } from "@tanstack/react-query";
import { makeCrudHooks } from "@/hooks/use-crud";
import { customersApi } from "../services/customers.api";
import type { Customer } from "../types";

const crud = makeCrudHooks<Customer>(customersApi, { queryKey: "customers", entityName: "Customer" });

export const { useList, useDetail, useCreate, useUpdate, useDelete } = crud;

export function useCustomerSummary(id: string | null | undefined) {
  return useQuery({
    queryKey: ["customers", "summary", id],
    queryFn: () => customersApi.summary(id as string),
    enabled: !!id,
  });
}
