import { apiDelete, apiGet, apiGetList, apiPatch, apiPost } from "@/lib/api";
import type { Flight } from "../types";

export const flightsApi = {
  list: (params: Record<string, any>) => apiGetList<Flight>("/flights", params),
  get: (id: string) => apiGet<Flight>(`/flights/${id}`),
  create: (data: any) => apiPost<Flight>("/flights", data),
  update: (id: string, data: any) => apiPatch<Flight>(`/flights/${id}`, data),
  remove: (id: string) => apiDelete<Flight>(`/flights/${id}`),
};
