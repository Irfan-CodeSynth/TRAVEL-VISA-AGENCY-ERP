import { apiDelete, apiGet, apiGetList, apiPatch, apiPost } from "@/lib/api";
import type { Customer, CustomerSummary } from "../types";

export const customersApi = {
  list: (params: Record<string, any>) => apiGetList<Customer>("/customers", params),
  get: (id: string) => apiGet<Customer>(`/customers/${id}`),
  summary: (id: string) => apiGet<CustomerSummary>(`/customers/${id}/summary`),
  create: (data: any) => apiPost<Customer>("/customers", data),
  update: (id: string, data: any) => apiPatch<Customer>(`/customers/${id}`, data),
  remove: (id: string) => apiDelete<Customer>(`/customers/${id}`),
};
