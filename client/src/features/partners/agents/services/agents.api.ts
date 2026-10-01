import { apiDelete, apiGet, apiGetList, apiPatch, apiPost } from "@/lib/api";
import type { Agent } from "../types";

export const agentsApi = {
  list: (params: Record<string, any>) => apiGetList<Agent>("/agents", params),
  get: (id: string) => apiGet<Agent>(`/agents/${id}`),
  create: (data: any) => apiPost<Agent>("/agents", data),
  update: (id: string, data: any) => apiPatch<Agent>(`/agents/${id}`, data),
  remove: (id: string) => apiDelete<Agent>(`/agents/${id}`),
};
