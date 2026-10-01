import { apiDelete, apiGet, apiGetList, apiPatch, apiPost } from "@/lib/api";
import type { Country } from "../types";

export const countriesApi = {
  list: (params: Record<string, any>) => apiGetList<Country>("/countries", params),
  get: (id: string) => apiGet<Country>(`/countries/${id}`),
  create: (data: any) => apiPost<Country>("/countries", data),
  update: (id: string, data: any) => apiPatch<Country>(`/countries/${id}`, data),
  remove: (id: string) => apiDelete<Country>(`/countries/${id}`),
};
