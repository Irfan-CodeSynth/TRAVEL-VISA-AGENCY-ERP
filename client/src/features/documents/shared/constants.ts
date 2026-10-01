import type { StatusMap, StatusTone } from "@/components/shared/status-badge";

import type { SelectOption } from "@/components/shared/form-fields";

const tone = (label: string, t: StatusTone) => ({ label, tone: t });

export const DOCUMENT_TYPES = [
  "PASSPORT", "CNIC", "B_FORM", "PHOTO", "APPLICATION_FORM", "AIR_TICKET", "HOTEL_VOUCHER",
  "INSURANCE", "MEDICAL", "POLICE_CERTIFICATE", "BANK_STATEMENT", "COVER_LETTER", "NOC", "OTHER",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

const TYPE_LABELS: Record<DocumentType, string> = {
  PASSPORT: "Passport",
  CNIC: "CNIC",
  B_FORM: "B-Form",
  PHOTO: "Photo",
  APPLICATION_FORM: "Application form",
  AIR_TICKET: "Air ticket",
  HOTEL_VOUCHER: "Hotel voucher",
  INSURANCE: "Insurance",
  MEDICAL: "Medical",
  POLICE_CERTIFICATE: "Police certificate",
  BANK_STATEMENT: "Bank statement",
  COVER_LETTER: "Cover letter",
  NOC: "NOC",
  OTHER: "Other",
};

export const DOCUMENT_TYPE_OPTIONS: SelectOption[] = DOCUMENT_TYPES.map((value) => ({
  value,
  label: TYPE_LABELS[value],
}));

export const DOCUMENT_TYPE_MAP: StatusMap = {
  PASSPORT: tone("Passport", "info"),
  CNIC: tone("CNIC", "secondary"),
  B_FORM: tone("B-Form", "secondary"),
  PHOTO: tone("Photo", "teal"),
  APPLICATION_FORM: tone("Application form", "purple"),
  AIR_TICKET: tone("Air ticket", "info"),
  HOTEL_VOUCHER: tone("Hotel voucher", "purple"),
  INSURANCE: tone("Insurance", "success"),
  MEDICAL: tone("Medical", "rose"),
  POLICE_CERTIFICATE: tone("Police certificate", "warning"),
  BANK_STATEMENT: tone("Bank statement", "warning"),
  COVER_LETTER: tone("Cover letter", "teal"),
  NOC: tone("NOC", "secondary"),
  OTHER: tone("Other", "secondary"),
};

export const DOCUMENT_STATUSES = ["PENDING", "VERIFIED", "REJECTED", "EXPIRED"] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const DOCUMENT_STATUS_MAP: StatusMap = {
  PENDING: tone("Pending", "warning"),
  VERIFIED: tone("Verified", "success"),
  REJECTED: tone("Rejected", "destructive"),
  EXPIRED: tone("Expired", "rose"),
};

export const DOCUMENT_STATUS_OPTIONS: SelectOption[] = DOCUMENT_STATUSES.map((value) => ({
  value,
  label: DOCUMENT_STATUS_MAP[value].label,
}));

export function formatBytes(bytes?: number | null): string {
  if (!bytes && bytes !== 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const DOCUMENT_MAX_SIZE_BYTES = 10 * 1024 * 1024;

export const DOCUMENT_ALLOWED_MIME = [
  "application/pdf", "image/jpeg", "image/png", "image/webp",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];
