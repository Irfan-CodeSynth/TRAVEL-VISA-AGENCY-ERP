import type { BookingItemType, BookingStatus, BookingType } from "../shared/constants";

export interface BookingCustomerRef {
  id: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
}

export interface BookingItem {
  id: string;
  bookingId: string;
  itemType: BookingItemType;
  refId: string | null;
  description: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  currencyCode: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  branchId: string;
  type: BookingType;
  status: BookingStatus;
  customerId: string;
  customer?: BookingCustomerRef | null;
  applicationId: string | null;
  travelDate: string | null;
  returnDate: string | null;
  paxCount: number;
  currencyCode: string;
  subtotal: string;
  discount: string;
  tax: string;
  totalAmount: string;
  paidAmount: string;
  paymentStatus: string;
  notes: string | null;
  assignedToUserId: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  items?: BookingItem[];
}

export function customerName(c?: BookingCustomerRef | null): string {
  if (!c) return "—";
  if (c.companyName) return c.companyName;
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || "—";
}
