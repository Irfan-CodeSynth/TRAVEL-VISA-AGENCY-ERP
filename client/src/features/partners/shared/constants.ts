import type { StatusMap, StatusTone } from "@/components/shared/status-badge";
import type { SelectOption } from "@/components/shared/form-fields";

const tone = (label: string, t: StatusTone) => ({ label, tone: t });

export const SUPPLIER_TYPES = [
  "AIRLINE", "HOTEL", "EMBASSY", "TRANSPORT", "INSURANCE", "VISA_AGENT", "OTHER",
] as const;
export type SupplierType = (typeof SUPPLIER_TYPES)[number];

export const SUPPLIER_TYPE_MAP: StatusMap = {
  AIRLINE: tone("Airline", "info"),
  HOTEL: tone("Hotel", "purple"),
  EMBASSY: tone("Embassy", "teal"),
  TRANSPORT: tone("Transport", "warning"),
  INSURANCE: tone("Insurance", "rose"),
  VISA_AGENT: tone("Visa agent", "success"),
  OTHER: tone("Other", "secondary"),
};

export const SUPPLIER_TYPE_OPTIONS: SelectOption[] = SUPPLIER_TYPES.map((value) => ({
  value,
  label: SUPPLIER_TYPE_MAP[value].label,
}));

export const COMMISSION_TYPES = ["PERCENTAGE", "FLAT"] as const;
export type CommissionType = (typeof COMMISSION_TYPES)[number];

export const COMMISSION_TYPE_MAP: StatusMap = {
  PERCENTAGE: tone("Percentage", "info"),
  FLAT: tone("Flat", "purple"),
};

export const COMMISSION_TYPE_OPTIONS: SelectOption[] = COMMISSION_TYPES.map((value) => ({
  value,
  label: COMMISSION_TYPE_MAP[value].label,
}));
