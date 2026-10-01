import { apiDelete, apiGet, apiGetList, apiPatch, apiPost } from "@/lib/api";
import type { FollowUp } from "../types";

export const followUpsApi = {
  list: (params: Record<string, any>) => apiGetList<FollowUp>("/follow-ups", params),
  get: (id: string) => apiGet<FollowUp>(`/follow-ups/${id}`),
  create: (data: any) => apiPost<FollowUp>("/follow-ups", data),
  update: (id: string, data: any) => apiPatch<FollowUp>(`/follow-ups/${id}`, data),
  remove: (id: string) => apiDelete<FollowUp>(`/follow-ups/${id}`),
  complete: (id: string) => apiPatch<FollowUp>(`/follow-ups/${id}/complete`, {}),
  upcoming: (days: number) => apiGet<FollowUp[]>("/follow-ups/upcoming", { days }),
  overdue: () => apiGet<FollowUp[]>("/follow-ups/overdue"),
};
