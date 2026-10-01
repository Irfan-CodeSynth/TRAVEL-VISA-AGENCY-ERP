import { formatRelativeTime, formatDate } from "@/lib/utils"

export function RelativeTime({ date, className }: { date: string | Date, className?: string }) {
  return (
    <span className={className} title={formatDate(date, "PPpp")}>
      {formatRelativeTime(date)}
    </span>
  )
}
