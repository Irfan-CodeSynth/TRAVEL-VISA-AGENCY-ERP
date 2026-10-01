import { apiDelete, apiGet, apiGetList, apiPatch, apiPost } from "@/lib/api";
import type { Communication } from "../types";

export const communicationsApi = {
  list: (params: Record<string, any>) => apiGetList<Communication>("/communications", params),
  get: (id: string) => apiGet<Communication>(`/communications/${id}`),
  create: (data: any) => apiPost<Communication>("/communications", data),
  update: (id: string, data: any) => apiPatch<Communication>(`/communications/${id}`, data),
  remove: (id: string) => apiDelete<Communication>(`/communications/${id}`),
};
