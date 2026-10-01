import type { SelectOption } from "@/components/shared/form-fields";

export const CABIN_CLASSES = ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"] as const;
export type CabinClass = (typeof CABIN_CLASSES)[number];

export const CABIN_OPTIONS: SelectOption[] = [
  { value: "ECONOMY", label: "Economy" },
  { value: "PREMIUM_ECONOMY", label: "Premium Economy" },
  { value: "BUSINESS", label: "Business" },
  { value: "FIRST", label: "First" },
];

export const CABIN_LABEL: Record<string, string> = Object.fromEntries(
  CABIN_OPTIONS.map((o) => [o.value, o.label])
);

export const MARGIN_TYPE_OPTIONS: SelectOption[] = [
  { value: "PERCENT", label: "Percent (%)" },
  { value: "FLAT", label: "Flat amount" },
];

export interface Margin {
  type: "PERCENT" | "FLAT";
  value: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function applyMargin(base: number, margin: Margin | null): number {
  if (!margin) return round2(base);
  if (margin.type === "PERCENT") return round2(base * (1 + margin.value / 100));
  return round2(base + margin.value);
}

/** Mirrors the server fallback: fare margin → airline default → global default. */
export function resolveMargin(
  fare: { marginType?: string | null; marginValue?: number | string | null },
  airline?: { defaultMarginType?: string | null; defaultMarginValue?: string | number | null } | null,
  globalDefault?: Margin | null
): Margin | null {
  if (fare.marginType && fare.marginValue != null && fare.marginValue !== "") {
    return { type: fare.marginType as any, value: Number(fare.marginValue) };
  }
  if (airline?.defaultMarginType && airline?.defaultMarginValue != null && airline.defaultMarginValue !== "") {
    return { type: airline.defaultMarginType as any, value: Number(airline.defaultMarginValue) };
  }
  return globalDefault ?? null;
}
