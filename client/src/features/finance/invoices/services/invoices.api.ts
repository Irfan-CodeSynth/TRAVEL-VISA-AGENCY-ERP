import { apiDelete, apiGet, apiGetList, apiPatch, apiPost } from "@/lib/api";
import type { Invoice } from "../types";

export const invoicesApi = {
  list: (params: Record<string, any>) => apiGetList<Invoice>("/invoices", params),
  get: (id: string) => apiGet<Invoice>(`/invoices/${id}`),
  create: (data: any) => apiPost<Invoice>("/invoices", data),
  update: (id: string, data: any) => apiPatch<Invoice>(`/invoices/${id}`, data),
  remove: (id: string) => apiDelete<Invoice>(`/invoices/${id}`),
  send: (id: string) => apiPost<Invoice>(`/invoices/${id}/send`, {}),
  markOverdue: (id: string) => apiPost<Invoice>(`/invoices/${id}/overdue`, {}),
  cancel: (id: string) => apiPost<Invoice>(`/invoices/${id}/cancel`, {}),
  addItem: (id: string, body: any) => apiPost<Invoice>(`/invoices/${id}/items`, body),
  updateItem: (id: string, itemId: string, body: any) =>
    apiPatch<Invoice>(`/invoices/${id}/items/${itemId}`, body),
  deleteItem: (id: string, itemId: string) => apiDelete<Invoice>(`/invoices/${id}/items/${itemId}`),
};
