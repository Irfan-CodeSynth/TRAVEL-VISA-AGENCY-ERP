import type { StatusMap, StatusTone } from "@/components/shared/status-badge";
import type { SelectOption } from "@/components/shared/form-fields";

export const LEAD_SOURCES = [
  "WEBSITE", "WALK_IN", "REFERRAL", "PHONE", "SOCIAL_MEDIA", "PARTNER_AGENT", "EVENT",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  WEBSITE: "Website",
  WALK_IN: "Walk-in",
  REFERRAL: "Referral",
  PHONE: "Phone",
  SOCIAL_MEDIA: "Social Media",
  PARTNER_AGENT: "Partner Agent",
  EVENT: "Event",
};

export const LEAD_SOURCE_OPTIONS: SelectOption[] = LEAD_SOURCES.map((value) => ({
  value,
  label: LEAD_SOURCE_LABELS[value],
}));

const tone = (label: string, t: StatusTone) => ({ label, tone: t });

export const LEAD_STATUS_MAP: StatusMap = {
  NEW: tone("New", "info"),
  CONTACTED: tone("Contacted", "secondary"),
  QUALIFIED: tone("Qualified", "purple"),
  PROPOSAL: tone("Proposal", "warning"),
  WON: tone("Won", "success"),
  LOST: tone("Lost", "destructive"),
};

export const LEAD_STATUS_OPTIONS: SelectOption[] = Object.entries(LEAD_STATUS_MAP).map(
  ([value, e]) => ({ value, label: e.label })
);

export const CUSTOMER_STATUS_MAP: StatusMap = {
  ACTIVE: tone("Active", "success"),
  VIP: tone("VIP", "purple"),
  INACTIVE: tone("Inactive", "secondary"),
  BLACKLISTED: tone("Blacklisted", "destructive"),
};

export const CUSTOMER_STATUS_OPTIONS: SelectOption[] = Object.entries(CUSTOMER_STATUS_MAP).map(
  ([value, e]) => ({ value, label: e.label })
);

export const CUSTOMER_TYPE_OPTIONS: SelectOption[] = [
  { value: "INDIVIDUAL", label: "Individual" },
  { value: "COMPANY", label: "Company" },
];

export const GENDER_OPTIONS: SelectOption[] = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
];

/** Sentinel used by optional Select fields (radix forbids empty-string values). */
export const NONE_OPTION: SelectOption = { value: "null", label: "— None —" };
