import { apiDelete, apiGet, apiGetList, apiPatch, apiPost } from "@/lib/api";
import type { Expense } from "../types";

export const expensesApi = {
  list: (params: Record<string, any>) => apiGetList<Expense>("/expenses", params),
  get: (id: string) => apiGet<Expense>(`/expenses/${id}`),
  create: (data: any) => apiPost<Expense>("/expenses", data),
  update: (id: string, data: any) => apiPatch<Expense>(`/expenses/${id}`, data),
  remove: (id: string) => apiDelete<Expense>(`/expenses/${id}`),
  changeStatus: (id: string, body: any) => apiPatch<Expense>(`/expenses/${id}/status`, body),
};
