import { Badge } from "@/components/ui/badge"

export type StatusTone =
  | "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
  | "info" | "purple" | "teal" | "rose"

export interface StatusMapEntry {
  label: string
  tone: StatusTone
}

export type StatusMap = Record<string, StatusMapEntry>

const CUSTOM_TONE_CLASS: Record<string, string> = {
  info: "border-transparent bg-sky-500/15 text-sky-600 dark:text-sky-400",
  purple: "border-transparent bg-purple-500/15 text-purple-600 dark:text-purple-400",
  teal: "border-transparent bg-teal-500/15 text-teal-600 dark:text-teal-400",
  rose: "border-transparent bg-rose-500/15 text-rose-600 dark:text-rose-400",
}

export function StatusBadge({
  value,
  map,
  className,
}: {
  value: string
  map?: StatusMap
  className?: string
}) {
  const entry = map?.[value]
  const label = entry?.label ?? value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  const tone: StatusTone = entry?.tone ?? "outline"

  const customClass = CUSTOM_TONE_CLASS[tone]
  if (customClass) {
    return <Badge variant="outline" className={`${customClass} ${className ?? ""}`}>{label}</Badge>
  }
  const badgeVariant = tone as "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
  return <Badge variant={badgeVariant} className={className}>{label}</Badge>
}
