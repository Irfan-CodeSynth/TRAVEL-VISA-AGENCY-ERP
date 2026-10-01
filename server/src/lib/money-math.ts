// Integer-cents helpers keep Decimal(12,2) money math exact.
export const toCents = (value: any): number => Math.round(Number(value ?? 0) * 100);
export const fromCents = (cents: number) => (cents / 100).toFixed(2);

export function derivePaymentStatus(paidCents: number, totalCents: number): string {
  if (paidCents <= 0) return 'UNPAID';
  if (paidCents >= totalCents) return 'PAID';
  return 'PARTIAL';
}
