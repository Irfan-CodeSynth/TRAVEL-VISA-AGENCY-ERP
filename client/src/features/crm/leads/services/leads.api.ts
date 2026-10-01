import { apiDelete, apiGet, apiGetList, apiPatch, apiPost } from "@/lib/api";
import type { Lead, LeadDetail } from "../types";

export const leadsApi = {
  list: (params: Record<string, any>) => apiGetList<Lead>("/leads", params),
  get: (id: string) => apiGet<LeadDetail>(`/leads/${id}`),
  create: (data: any) => apiPost<Lead>("/leads", data),
  update: (id: string, data: any) => apiPatch<Lead>(`/leads/${id}`, data),
  remove: (id: string) => apiDelete<Lead>(`/leads/${id}`),
  convert: (id: string) => apiPost<ConvertedCustomer>(`/leads/${id}/convert`, {}),
  lose: (id: string, body?: { reason?: string }) => apiPost<Lead>(`/leads/${id}/lose`, body ?? {}),
};

export interface ConvertedCustomer {
  id: string;
  customerNumber: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  phone: string;
  email: string | null;
  status: string;
}
