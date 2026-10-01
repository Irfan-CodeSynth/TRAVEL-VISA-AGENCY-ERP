import { apiDelete, apiGet, apiGetList, apiPatch, apiPost } from "@/lib/api";
import type { Hotel } from "../types";

export const hotelsApi = {
  list: (params: Record<string, any>) => apiGetList<Hotel>("/hotels", params),
  get: (id: string) => apiGet<Hotel>(`/hotels/${id}`),
  create: (data: any) => apiPost<Hotel>("/hotels", data),
  update: (id: string, data: any) => apiPatch<Hotel>(`/hotels/${id}`, data),
  remove: (id: string) => apiDelete<Hotel>(`/hotels/${id}`),
};
