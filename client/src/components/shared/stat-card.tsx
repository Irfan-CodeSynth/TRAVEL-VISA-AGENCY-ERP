import { LucideIcon, ArrowUp, ArrowDown } from "lucide-react"
import { motion, useMotionValue, useTransform, animate } from "framer-motion"
import { useEffect } from "react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: number
  change?: number
  changeLabel?: string
  icon: LucideIcon
  iconColor?: string
  trend?: "up" | "down" | "neutral"
  formatAsCurrency?: boolean
}

export function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  iconColor = "text-primary",
  trend,
  formatAsCurrency,
}: StatCardProps) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) => 
    formatAsCurrency 
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(latest)
      : new Intl.NumberFormat("en-US").format(Math.round(latest))
  )

  useEffect(() => {
    const animation = animate(count, value, { duration: 1 })
    return animation.stop
  }, [value, count])

  return (
    <motion.div
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <Icon className={cn("h-4 w-4", iconColor)} />
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <motion.h2 className="text-3xl font-bold">{rounded}</motion.h2>
      </div>
      {(change !== undefined || changeLabel) && (
        <div className="mt-2 flex items-center text-sm">
          {change !== undefined && (
            <span
              className={cn(
                "flex items-center font-medium",
                trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {trend === "up" && <ArrowUp className="mr-1 h-3 w-3" />}
              {trend === "down" && <ArrowDown className="mr-1 h-3 w-3" />}
              {Math.abs(change)}%
            </span>
          )}
          {changeLabel && <span className="ml-2 text-muted-foreground">{changeLabel}</span>}
        </div>
      )}
    </motion.div>
  )
}
