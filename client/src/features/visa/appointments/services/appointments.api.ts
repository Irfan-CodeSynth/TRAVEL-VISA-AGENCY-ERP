import { apiDelete, apiGet, apiGetList, apiPatch, apiPost } from "@/lib/api";
import type { Appointment } from "../types";

export const appointmentsApi = {
  list: (params: Record<string, any>) => apiGetList<Appointment>("/appointments", params),
  get: (id: string) => apiGet<Appointment>(`/appointments/${id}`),
  create: (data: any) => apiPost<Appointment>("/appointments", data),
  update: (id: string, data: any) => apiPatch<Appointment>(`/appointments/${id}`, data),
  remove: (id: string) => apiDelete<Appointment>(`/appointments/${id}`),
  changeStatus: (id: string, body: { status: string; scheduledAt?: string; notes?: string }) =>
    apiPatch<Appointment>(`/appointments/${id}/status`, body),
  upcoming: (days = 7) => apiGet<Appointment[]>("/appointments/upcoming", { days }),
};
