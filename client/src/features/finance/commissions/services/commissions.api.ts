import { apiDelete, apiGet, apiGetList, apiPatch, apiPost } from "@/lib/api";
import type { Commission } from "../types";

export const commissionsApi = {
  list: (params: Record<string, any>) => apiGetList<Commission>("/commissions", params),
  get: (id: string) => apiGet<Commission>(`/commissions/${id}`),
  create: (data: any) => apiPost<Commission>("/commissions", data),
  remove: (id: string) => apiDelete<Commission>(`/commissions/${id}`),
  generate: (body: { bookingId: string; agentId: string }) => apiPost<Commission>("/commissions/generate", body),
  changeStatus: (id: string, body: any) => apiPatch<Commission>(`/commissions/${id}/status`, body),
};
