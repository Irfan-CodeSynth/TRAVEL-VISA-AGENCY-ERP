import { apiDelete, apiGet, apiGetList, apiPatch, apiPost } from "@/lib/api";
import type { TravelPackage } from "../types";

export const packagesApi = {
  list: (params: Record<string, any>) => apiGetList<TravelPackage>("/packages", params),
  get: (id: string) => apiGet<TravelPackage>(`/packages/${id}`),
  create: (data: any) => apiPost<TravelPackage>("/packages", data),
  update: (id: string, data: any) => apiPatch<TravelPackage>(`/packages/${id}`, data),
  remove: (id: string) => apiDelete<TravelPackage>(`/packages/${id}`),
};
