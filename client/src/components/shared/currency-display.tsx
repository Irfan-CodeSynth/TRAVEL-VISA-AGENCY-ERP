import { formatCurrency } from "@/lib/utils"

interface CurrencyDisplayProps {
  amount: number
  currency?: string
  className?: string
}

export function CurrencyDisplay({ amount, currency = "USD", className }: CurrencyDisplayProps) {
  return <span className={className}>{formatCurrency(amount, currency)}</span>
}
