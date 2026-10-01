import { apiDelete, apiGet, apiGetList, apiPatch, apiPost } from "@/lib/api";
import type { VisaType } from "../types";

export const visaTypesApi = {
  list: (params: Record<string, any>) => apiGetList<VisaType>("/visa-types", params),
  get: (id: string) => apiGet<VisaType>(`/visa-types/${id}`),
  create: (data: any) => apiPost<VisaType>("/visa-types", data),
  update: (id: string, data: any) => apiPatch<VisaType>(`/visa-types/${id}`, data),
  remove: (id: string) => apiDelete<VisaType>(`/visa-types/${id}`),
};
