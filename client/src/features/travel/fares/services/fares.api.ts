import { apiGet, apiGetList, apiPatch, apiPost, apiDelete, apiPut } from "@/lib/api";
import type { Airport, Airline, FlightFare } from "../types";

export interface MarginDefault {
  type: "PERCENT" | "FLAT";
  value: number;
}

interface SettingRow {
  key: string;
  branchId: string | null;
  value: any;
}

export interface FareSearchParams {
  fromCode?: string;
  toCode?: string;
  date?: string;
  cabinClass?: string;
  pax?: number;
}

export const faresApi = {
  list: (params: Record<string, any>) => apiGetList<FlightFare>("/flight-fares", params),
  get: (id: string) => apiGet<FlightFare>(`/flight-fares/${id}`),
  create: (data: any) => apiPost<FlightFare>("/flight-fares", data),
  update: (id: string, data: any) => apiPatch<FlightFare>(`/flight-fares/${id}`, data),
  remove: (id: string) => apiDelete<FlightFare>(`/flight-fares/${id}`),
  search: (params: FareSearchParams) => apiGet<FlightFare[]>("/flight-fares/search", params),
  sell: (id: string, body: { customerId: string; pax?: number; notes?: string }) =>
    apiPost<any>(`/flight-fares/${id}/sell`, body),
  globalMarginDefault: async (): Promise<MarginDefault | null> => {
    try {
      const rows = await apiGet<SettingRow[]>("/settings", { group: "flights" });
      const row = (rows ?? []).find((s) => s.key === "defaultMargin" && !s.branchId);
      const v = row?.value;
      if (v && (v.type === "PERCENT" || v.type === "FLAT") && Number.isFinite(Number(v.value))) {
        return { type: v.type, value: Number(v.value) };
      }
    } catch {
      // settings.view not granted — treat as no global default
    }
    return null;
  },
  setGlobalMarginDefault: (margin: MarginDefault | null) =>
    apiPut<any>("/settings", {
      branchId: null,
      group: "flights",
      settings: [{ key: "defaultMargin", value: margin }],
    }),
};

export const airportsApi = {
  search: (search: string) => apiGetList<Airport>("/airports", { search, limit: 25, active: "true" }),
};

export const airlinesApi = {
  search: (search: string) => apiGetList<Airline>("/airlines", { search, limit: 25, active: "true" }),
};
