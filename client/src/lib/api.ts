import api from '@/services/api-client';

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: Pagination;
}

/** Unwraps the server envelope { success, message, data } */
async function unwrap<T>(promise: Promise<{ data: any }>): Promise<T> {
  const res = await promise;
  return res.data.data as T;
}

export function apiGet<T>(url: string, params?: Record<string, any>): Promise<T> {
  return unwrap<T>(api.get(url, { params }));
}

export async function apiGetList<T>(url: string, params?: Record<string, any>): Promise<Paginated<T>> {
  const res = await api.get(url, { params });
  return { data: res.data.data as T[], pagination: res.data.pagination as Pagination };
}

export function apiPost<T>(url: string, body?: any): Promise<T> {
  return unwrap<T>(api.post(url, body));
}

export function apiPut<T>(url: string, body?: any): Promise<T> {
  return unwrap<T>(api.put(url, body));
}

export function apiPatch<T>(url: string, body?: any): Promise<T> {
  return unwrap<T>(api.patch(url, body));
}

export function apiDelete<T>(url: string, body?: any): Promise<T> {
  return unwrap<T>(api.delete(url, { data: body }));
}

/** Downloads an authenticated endpoint as a file (e.g. /documents/:id/download). */
export async function apiDownloadFile(url: string, filename: string): Promise<void> {
  const res = await api.get(url, { responseType: 'blob' });
  const blobUrl = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}

export function apiErrorMessage(err: any, fallback = 'Something went wrong'): string {
  if (err?.response?.data?.errors?.length) {
    return err.response.data.errors.map((e: any) => `${e.field}: ${e.message}`).join(', ');
  }
  return err?.response?.data?.message || err?.message || fallback;
}

/** Drops empty-string/null entries so PATCH only sends what the user actually changed. */
export function cleanPayload<T extends Record<string, any>>(obj: T): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === '' || value === undefined) continue;
    out[key] = value === 'null' ? null : value;
  }
  return out;
}
