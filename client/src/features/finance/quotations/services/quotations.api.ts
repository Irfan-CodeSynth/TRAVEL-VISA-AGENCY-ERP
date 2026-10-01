import { apiDelete, apiGet, apiGetList, apiPatch, apiPost } from "@/lib/api";
import type { Quotation } from "../types";

export const quotationsApi = {
  list: (params: Record<string, any>) => apiGetList<Quotation>("/quotations", params),
  get: (id: string) => apiGet<Quotation>(`/quotations/${id}`),
  create: (data: any) => apiPost<Quotation>("/quotations", data),
  update: (id: string, data: any) => apiPatch<Quotation>(`/quotations/${id}`, data),
  remove: (id: string) => apiDelete<Quotation>(`/quotations/${id}`),
  changeStatus: (id: string, body: any) => apiPatch<Quotation>(`/quotations/${id}/status`, body),
  convert: (id: string) => apiPost<any>(`/quotations/${id}/convert`, {}),
  addItem: (id: string, body: any) => apiPost<Quotation>(`/quotations/${id}/items`, body),
  updateItem: (id: string, itemId: string, body: any) =>
    apiPatch<Quotation>(`/quotations/${id}/items/${itemId}`, body),
  deleteItem: (id: string, itemId: string) => apiDelete<Quotation>(`/quotations/${id}/items/${itemId}`),
};
