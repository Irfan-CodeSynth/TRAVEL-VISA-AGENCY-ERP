import type { StatusMap } from "@/components/shared/status-badge";
import type { SelectOption } from "@/components/shared/form-fields";

export const FOLLOW_UP_TYPES = ["CALL", "WHATSAPP", "EMAIL", "SMS", "VISIT", "MEETING"] as const;
export type FollowUpType = (typeof FOLLOW_UP_TYPES)[number];

export type FollowUpStatus = "PENDING" | "COMPLETED" | "MISSED" | "CANCELLED";
export type FollowUpPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

const tone = (label: string, t: StatusMap[string]["tone"]) => ({ label, tone: t });

export const FOLLOW_UP_STATUS_MAP: StatusMap = {
  PENDING: tone("Pending", "warning"),
  COMPLETED: tone("Completed", "success"),
  MISSED: tone("Missed", "destructive"),
  CANCELLED: tone("Cancelled", "secondary"),
};

export const FOLLOW_UP_STATUS_OPTIONS: SelectOption[] = Object.entries(FOLLOW_UP_STATUS_MAP).map(
  ([value, e]) => ({ value, label: e.label })
);

export const FOLLOW_UP_TYPE_OPTIONS: SelectOption[] = [
  { value: "CALL", label: "Call" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "EMAIL", label: "Email" },
  { value: "SMS", label: "SMS" },
  { value: "VISIT", label: "Visit" },
  { value: "MEETING", label: "Meeting" },
];

export const FOLLOW_UP_PRIORITY_MAP: StatusMap = {
  LOW: tone("Low", "secondary"),
  MEDIUM: tone("Medium", "info"),
  HIGH: tone("High", "warning"),
  URGENT: tone("Urgent", "destructive"),
};

export const FOLLOW_UP_PRIORITY_OPTIONS: SelectOption[] = Object.entries(FOLLOW_UP_PRIORITY_MAP).map(
  ([value, e]) => ({ value, label: e.label })
);
