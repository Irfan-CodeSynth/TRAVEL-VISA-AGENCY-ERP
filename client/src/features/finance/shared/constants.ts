import type { StatusMap, StatusTone } from "@/components/shared/status-badge";
import type { SelectOption } from "@/components/shared/form-fields";

const tone = (label: string, t: StatusTone) => ({ label, tone: t });

export const QUOTATION_STATUSES = [
  "DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED", "CONVERTED",
] as const;
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export const QUOTATION_STATUS_MAP: StatusMap = {
  DRAFT: tone("Draft", "secondary"),
  SENT: tone("Sent", "info"),
  ACCEPTED: tone("Accepted", "success"),
  REJECTED: tone("Rejected", "destructive"),
  EXPIRED: tone("Expired", "warning"),
  CONVERTED: tone("Converted", "teal"),
};

export const QUOTATION_STATUS_OPTIONS: SelectOption[] = QUOTATION_STATUSES.map((value) => ({
  value,
  label: QUOTATION_STATUS_MAP[value].label,
}));

export const INVOICE_STATUSES = [
  "DRAFT", "SENT", "OVERDUE", "PARTIALLY_PAID", "PAID", "CANCELLED", "REFUNDED",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_STATUS_MAP: StatusMap = {
  DRAFT: tone("Draft", "secondary"),
  SENT: tone("Sent", "info"),
  OVERDUE: tone("Overdue", "rose"),
  PARTIALLY_PAID: tone("Partially paid", "warning"),
  PAID: tone("Paid", "success"),
  CANCELLED: tone("Cancelled", "destructive"),
  REFUNDED: tone("Refunded", "purple"),
};

export const INVOICE_STATUS_OPTIONS: SelectOption[] = INVOICE_STATUSES.map((value) => ({
  value,
  label: INVOICE_STATUS_MAP[value].label,
}));

export const PAYMENT_METHODS = [
  "CASH", "CARD", "BANK_TRANSFER", "CHEQUE", "ONLINE", "ADJUSTMENT",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_MAP: StatusMap = {
  CASH: tone("Cash", "success"),
  CARD: tone("Card", "info"),
  BANK_TRANSFER: tone("Bank transfer", "purple"),
  CHEQUE: tone("Cheque", "warning"),
  ONLINE: tone("Online", "teal"),
  ADJUSTMENT: tone("Adjustment", "secondary"),
};

export const PAYMENT_METHOD_OPTIONS: SelectOption[] = PAYMENT_METHODS.map((value) => ({
  value,
  label: PAYMENT_METHOD_MAP[value].label,
}));

export const PAYMENT_STATUSES = ["COMPLETED", "PENDING", "FAILED", "REFUNDED"] as const;
export type PaymentRecordStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_MAP: StatusMap = {
  COMPLETED: tone("Completed", "success"),
  PENDING: tone("Pending", "warning"),
  FAILED: tone("Failed", "destructive"),
  REFUNDED: tone("Refunded", "purple"),
};

export const PAYMENT_STATUS_OPTIONS: SelectOption[] = PAYMENT_STATUSES.map((value) => ({
  value,
  label: PAYMENT_STATUS_MAP[value].label,
}));

export const EXPENSE_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export const EXPENSE_STATUS_MAP: StatusMap = {
  PENDING: tone("Pending", "warning"),
  APPROVED: tone("Approved", "success"),
  REJECTED: tone("Rejected", "destructive"),
};

export const EXPENSE_STATUS_OPTIONS: SelectOption[] = EXPENSE_STATUSES.map((value) => ({
  value,
  label: EXPENSE_STATUS_MAP[value].label,
}));

export const COMMISSION_STATUSES = ["PENDING", "APPROVED", "REJECTED", "PAID"] as const;
export type CommissionStatus = (typeof COMMISSION_STATUSES)[number];

export const COMMISSION_STATUS_MAP: StatusMap = {
  PENDING: tone("Pending", "warning"),
  APPROVED: tone("Approved", "info"),
  REJECTED: tone("Rejected", "destructive"),
  PAID: tone("Paid", "success"),
};

export const COMMISSION_STATUS_OPTIONS: SelectOption[] = COMMISSION_STATUSES.map((value) => ({
  value,
  label: COMMISSION_STATUS_MAP[value].label,
}));

export const COMMISSION_TYPES = ["PERCENTAGE", "FLAT"] as const;
export type CommissionType = (typeof COMMISSION_TYPES)[number];

export const COMMISSION_TYPE_OPTIONS: SelectOption[] = [
  { value: "PERCENTAGE", label: "Percentage" },
  { value: "FLAT", label: "Flat amount" },
];
