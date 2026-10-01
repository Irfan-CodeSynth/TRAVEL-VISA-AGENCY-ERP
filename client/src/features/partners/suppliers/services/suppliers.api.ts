import { apiDelete, apiGet, apiGetList, apiPatch, apiPost } from "@/lib/api";
import type { Supplier } from "../types";

export const suppliersApi = {
  list: (params: Record<string, any>) => apiGetList<Supplier>("/suppliers", params),
  get: (id: string) => apiGet<Supplier>(`/suppliers/${id}`),
  create: (data: any) => apiPost<Supplier>("/suppliers", data),
  update: (id: string, data: any) => apiPatch<Supplier>(`/suppliers/${id}`, data),
  remove: (id: string) => apiDelete<Supplier>(`/suppliers/${id}`),
};
