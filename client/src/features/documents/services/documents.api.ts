import { apiDelete, apiDownloadFile, apiGet, apiGetList, apiPatch, apiPost } from "@/lib/api";
import type { Document } from "../types";

export const documentsApi = {
  list: (params: Record<string, any>) => apiGetList<Document>("/documents", params),
  get: (id: string) => apiGet<Document>(`/documents/${id}`),
  upload: (formData: FormData) => apiPost<Document>("/documents", formData),
  update: (id: string, data: any) => apiPatch<Document>(`/documents/${id}`, data),
  changeStatus: (id: string, body: { status: string; rejectReason?: string }) =>
    apiPatch<Document>(`/documents/${id}/status`, body),
  remove: (id: string) => apiDelete<Document>(`/documents/${id}`),
  download: (doc: Document) => apiDownloadFile(`/documents/${doc.id}/download`, doc.fileName),
};
