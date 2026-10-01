import type { StatusMap, StatusTone } from "@/components/shared/status-badge";
import type { SelectOption } from "@/components/shared/form-fields";

const tone = (label: string, t: StatusTone) => ({ label, tone: t });

export const PACKAGE_TYPES = [
  "UMRAH", "HAJJ", "TOUR", "PILGRIMAGE", "CORPORATE", "CUSTOM",
] as const;
export type PackageType = (typeof PACKAGE_TYPES)[number];

export const PACKAGE_TYPE_MAP: StatusMap = {
  UMRAH: tone("Umrah", "teal"),
  HAJJ: tone("Hajj", "purple"),
  TOUR: tone("Tour", "info"),
  PILGRIMAGE: tone("Pilgrimage", "rose"),
  CORPORATE: tone("Corporate", "warning"),
  CUSTOM: tone("Custom", "secondary"),
};

export const PACKAGE_TYPE_OPTIONS: SelectOption[] = PACKAGE_TYPES.map((value) => ({
  value,
  label: PACKAGE_TYPE_MAP[value].label,
}));

export const FLIGHT_CLASSES = ["ECONOMY", "BUSINESS", "FIRST"] as const;

export const FLIGHT_CLASS_OPTIONS: SelectOption[] = [
  { value: "ECONOMY", label: "Economy" },
  { value: "BUSINESS", label: "Business" },
  { value: "FIRST", label: "First" },
];

export const ROOM_TYPES = [
  "SINGLE", "DOUBLE", "TWIN", "TRIPLE", "QUAD", "SUITE", "STANDARD", "DELUXE",
] as const;

export const ROOM_TYPE_OPTIONS: SelectOption[] = [
  "Single", "Double", "Twin", "Triple", "Quad", "Standard", "Deluxe", "Suite",
].map((label) => ({ value: label, label }));

export const BOOKING_TYPES = [
  "FLIGHT", "HOTEL", "PACKAGE", "VISA", "TRANSFER", "TOUR", "MIXED",
] as const;
export type BookingType = (typeof BOOKING_TYPES)[number];

export const BOOKING_TYPE_MAP: StatusMap = {
  FLIGHT: tone("Flight", "info"),
  HOTEL: tone("Hotel", "purple"),
  PACKAGE: tone("Package", "teal"),
  VISA: tone("Visa", "success"),
  TRANSFER: tone("Transfer", "warning"),
  TOUR: tone("Tour", "rose"),
  MIXED: tone("Mixed", "secondary"),
};

export const BOOKING_TYPE_OPTIONS: SelectOption[] = BOOKING_TYPES.map((value) => ({
  value,
  label: BOOKING_TYPE_MAP[value].label,
}));

export const BOOKING_STATUSES = ["DRAFT", "CONFIRMED", "CANCELLED", "COMPLETED"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_STATUS_MAP: StatusMap = {
  DRAFT: tone("Draft", "secondary"),
  CONFIRMED: tone("Confirmed", "success"),
  CANCELLED: tone("Cancelled", "destructive"),
  COMPLETED: tone("Completed", "info"),
};

export const BOOKING_STATUS_OPTIONS: SelectOption[] = BOOKING_STATUSES.map((value) => ({
  value,
  label: BOOKING_STATUS_MAP[value].label,
}));

export const PAYMENT_STATUS_MAP: StatusMap = {
  UNPAID: tone("Unpaid", "secondary"),
  PARTIAL: tone("Partial", "warning"),
  PAID: tone("Paid", "success"),
};

export const BOOKING_ITEM_TYPES = [
  "FLIGHT", "HOTEL", "PACKAGE", "VISA", "SERVICE", "TRANSFER", "TAX", "OTHER",
] as const;
export type BookingItemType = (typeof BOOKING_ITEM_TYPES)[number];

export const BOOKING_ITEM_TYPE_MAP: StatusMap = {
  FLIGHT: tone("Flight", "info"),
  HOTEL: tone("Hotel", "purple"),
  PACKAGE: tone("Package", "teal"),
  VISA: tone("Visa", "success"),
  SERVICE: tone("Service", "warning"),
  TRANSFER: tone("Transfer", "rose"),
  TAX: tone("Tax", "destructive"),
  OTHER: tone("Other", "secondary"),
};

export const BOOKING_ITEM_TYPE_OPTIONS: SelectOption[] = BOOKING_ITEM_TYPES.map((value) => ({
  value,
  label: BOOKING_ITEM_TYPE_MAP[value].label,
}));
