import { apiDelete, apiGet, apiGetList, apiPost } from "@/lib/api";
import type { Payment } from "../types";

export const paymentsApi = {
  list: (params: Record<string, any>) => apiGetList<Payment>("/payments", params),
  get: (id: string) => apiGet<Payment>(`/payments/${id}`),
  create: (data: any) => apiPost<Payment>("/payments", data),
  remove: (id: string) => apiDelete<Payment>(`/payments/${id}`),
  confirm: (id: string) => apiPost<Payment>(`/payments/${id}/confirm`, {}),
  fail: (id: string) => apiPost<Payment>(`/payments/${id}/fail`, {}),
  refund: (id: string, body: any) => apiPost<Payment>(`/payments/${id}/refund`, body),
};
