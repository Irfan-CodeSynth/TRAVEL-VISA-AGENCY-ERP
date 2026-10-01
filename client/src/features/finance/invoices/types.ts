import type { InvoiceStatus } from "../shared/constants";
import type { QuotationCustomerRef } from "../quotations/types";

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoicePaymentRef {
  id: string;
  paymentNumber: string;
  amount: string;
  currencyCode: string;
  method: string;
  status: string;
  paidAt: string;
  isRefund: boolean;
  refundedAmount: string;
  reference: string | null;
  notes: string | null;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  branchId: string;
  customerId: string;
  customer?: QuotationCustomerRef | null;
  quotationId: string | null;
  bookingId: string | null;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string | null;
  currencyCode: string;
  subtotal: string;
  discount: string;
  tax: string;
  totalAmount: string;
  paidAmount: string;
  balanceDue: string;
  notes: string | null;
  sentAt: string | null;
  cancelledAt: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  items?: InvoiceItem[];
  payments?: InvoicePaymentRef[];
}

export function invoiceCustomerName(c?: QuotationCustomerRef | null): string {
  if (!c) return "—";
  if (c.companyName) return c.companyName;
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || "—";
}
