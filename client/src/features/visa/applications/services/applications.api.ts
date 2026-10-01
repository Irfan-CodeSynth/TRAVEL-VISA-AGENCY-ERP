import { apiDelete, apiGet, apiGetList, apiPatch, apiPost } from "@/lib/api";
import type { Application, ApplicationDetail, TimelineEvent, TransitionInfo } from "../types";

export const applicationsApi = {
  list: (params: Record<string, any>) => apiGetList<Application>("/applications", params),
  get: (id: string) => apiGet<ApplicationDetail>(`/applications/${id}`),
  create: (data: any) => apiPost<Application>("/applications", data),
  update: (id: string, data: any) => apiPatch<Application>(`/applications/${id}`, data),
  remove: (id: string) => apiDelete<Application>(`/applications/${id}`),
  changeStatus: (id: string, body: { status: string; note?: string }) =>
    apiPatch<Application>(`/applications/${id}/status`, body),
  transitions: (id: string) => apiGet<TransitionInfo>(`/applications/${id}/transitions`),
  timeline: (id: string) => apiGet<TimelineEvent[]>(`/applications/${id}/timeline`),
  stats: (params?: Record<string, any>) => apiGet<any>("/applications/stats", params),
};
