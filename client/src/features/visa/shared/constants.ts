import type { StatusMap, StatusTone } from "@/components/shared/status-badge";
import type { SelectOption } from "@/components/shared/form-fields";

const tone = (label: string, t: StatusTone) => ({ label, tone: t });

export const APPLICATION_STATUSES = [
  "DRAFT", "SUBMITTED", "UNDER_REVIEW", "AT_EMBASSY", "ADDITIONAL_DOCS",
  "APPROVED", "REJECTED", "RETURNED", "WITHDRAWN",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_MAP: StatusMap = {
  DRAFT: tone("Draft", "secondary"),
  SUBMITTED: tone("Submitted", "info"),
  UNDER_REVIEW: tone("Under review", "purple"),
  AT_EMBASSY: tone("At embassy", "warning"),
  ADDITIONAL_DOCS: tone("Additional docs", "rose"),
  APPROVED: tone("Approved", "success"),
  REJECTED: tone("Rejected", "destructive"),
  RETURNED: tone("Returned", "teal"),
  WITHDRAWN: tone("Withdrawn", "outline"),
};

export const APPLICATION_STATUS_OPTIONS: SelectOption[] = Object.entries(
  APPLICATION_STATUS_MAP
).map(([value, e]) => ({ value, label: e.label }));

/** Main pipeline used for the stepper on the application detail page. */
export const APPLICATION_PIPELINE: ApplicationStatus[] = [
  "DRAFT", "SUBMITTED", "UNDER_REVIEW", "AT_EMBASSY", "APPROVED",
];

export const APPOINTMENT_TYPES = [
  "BIOMETRICS", "INTERVIEW", "MEDICAL", "DOCUMENT_SUBMISSION", "COLLECTION", "OTHER",
] as const;
export type AppointmentType = (typeof APPOINTMENT_TYPES)[number];

export const APPOINTMENT_TYPE_MAP: StatusMap = {
  BIOMETRICS: tone("Biometrics", "teal"),
  INTERVIEW: tone("Interview", "purple"),
  MEDICAL: tone("Medical", "rose"),
  DOCUMENT_SUBMISSION: tone("Document submission", "info"),
  COLLECTION: tone("Collection", "warning"),
  OTHER: tone("Other", "secondary"),
};

export const APPOINTMENT_TYPE_OPTIONS: SelectOption[] = APPOINTMENT_TYPES.map((value) => ({
  value,
  label: APPOINTMENT_TYPE_MAP[value].label,
}));

export const APPOINTMENT_STATUSES = ["SCHEDULED", "COMPLETED", "MISSED", "RESCHEDULED", "CANCELLED"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_STATUS_MAP: StatusMap = {
  SCHEDULED: tone("Scheduled", "info"),
  COMPLETED: tone("Completed", "success"),
  MISSED: tone("Missed", "destructive"),
  RESCHEDULED: tone("Rescheduled", "warning"),
  CANCELLED: tone("Cancelled", "outline"),
};

export const APPOINTMENT_STATUS_OPTIONS: SelectOption[] = Object.entries(
  APPOINTMENT_STATUS_MAP
).map(([value, e]) => ({ value, label: e.label }));

export const VISA_CATEGORIES = ["TOURIST", "BUSINESS", "WORK", "STUDENT", "RESIDENCE", "TRANSIT", "PILGRIMAGE", "MEDICAL", "OTHER"] as const;

export const VISA_CATEGORY_OPTIONS: SelectOption[] = VISA_CATEGORIES.map((value) => ({
  value,
  label: value.charAt(0) + value.slice(1).toLowerCase(),
}));
