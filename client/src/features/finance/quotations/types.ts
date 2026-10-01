import type { BookingItemType } from "../../travel/shared/constants";
import type { QuotationStatus } from "../shared/constants";

export interface QuotationCustomerRef {
  id: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
}

export interface QuotationItem {
  id: string;
  quotationId: string;
  itemType: BookingItemType;
  refId: string | null;
  description: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  createdAt: string;
  updatedAt: string;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  branchId: string;
  customerId: string;
  customer?: QuotationCustomerRef | null;
  bookingId: string | null;
  status: QuotationStatus;
  validUntil: string | null;
  currencyCode: string;
  subtotal: string;
  discount: string;
  tax: string;
  totalAmount: string;
  notes: string | null;
  sentAt: string | null;
  acceptedAt: string | null;
  convertedAt: string | null;
  invoiceId: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  items?: QuotationItem[];
}

export function quotationCustomerName(c?: QuotationCustomerRef | null): string {
  if (!c) return "—";
  if (c.companyName) return c.companyName;
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || "—";
}
