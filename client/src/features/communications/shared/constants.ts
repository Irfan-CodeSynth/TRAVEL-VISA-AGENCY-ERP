import type { StatusMap, StatusTone } from "@/components/shared/status-badge";
import type { SelectOption } from "@/components/shared/form-fields";

const tone = (label: string, t: StatusTone) => ({ label, tone: t });

export const CHANNELS = ["CALL", "WHATSAPP", "EMAIL", "SMS", "VISIT", "MEETING"] as const;
export type Channel = (typeof CHANNELS)[number];

export const CHANNEL_MAP: StatusMap = {
  CALL: tone("Call", "info"),
  WHATSAPP: tone("WhatsApp", "success"),
  EMAIL: tone("Email", "purple"),
  SMS: tone("SMS", "secondary"),
  VISIT: tone("Visit", "teal"),
  MEETING: tone("Meeting", "warning"),
};

export const CHANNEL_OPTIONS: SelectOption[] = CHANNELS.map((value) => ({
  value,
  label: CHANNEL_MAP[value].label,
}));

export const COMM_DIRECTIONS = ["INBOUND", "OUTBOUND"] as const;
export type CommDirection = (typeof COMM_DIRECTIONS)[number];

export const COMM_DIRECTION_MAP: StatusMap = {
  INBOUND: tone("Inbound", "teal"),
  OUTBOUND: tone("Outbound", "info"),
};

export const COMM_DIRECTION_OPTIONS: SelectOption[] = COMM_DIRECTIONS.map((value) => ({
  value,
  label: COMM_DIRECTION_MAP[value].label,
}));

export const COMM_STATUSES = ["PENDING", "SENT", "FAILED", "RECEIVED"] as const;
export type CommStatus = (typeof COMM_STATUSES)[number];

export const COMM_STATUS_MAP: StatusMap = {
  PENDING: tone("Pending", "warning"),
  SENT: tone("Sent", "success"),
  FAILED: tone("Failed", "destructive"),
  RECEIVED: tone("Received", "info"),
};

export const COMM_STATUS_OPTIONS: SelectOption[] = COMM_STATUSES.map((value) => ({
  value,
  label: COMM_STATUS_MAP[value].label,
}));
