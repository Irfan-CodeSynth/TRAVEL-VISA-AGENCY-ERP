import { apiDelete, apiGet, apiGetList, apiPatch, apiPost } from "@/lib/api";
import type { Booking } from "../types";

export const bookingsApi = {
  list: (params: Record<string, any>) => apiGetList<Booking>("/bookings", params),
  get: (id: string) => apiGet<Booking>(`/bookings/${id}`),
  create: (data: any) => apiPost<Booking>("/bookings", data),
  update: (id: string, data: any) => apiPatch<Booking>(`/bookings/${id}`, data),
  remove: (id: string) => apiDelete<Booking>(`/bookings/${id}`),
  changeStatus: (id: string, body: any) => apiPatch<Booking>(`/bookings/${id}/status`, body),
  addItem: (id: string, body: any) => apiPost<Booking>(`/bookings/${id}/items`, body),
  updateItem: (id: string, itemId: string, body: any) =>
    apiPatch<Booking>(`/bookings/${id}/items/${itemId}`, body),
  deleteItem: (id: string, itemId: string) => apiDelete<Booking>(`/bookings/${id}/items/${itemId}`),
};
