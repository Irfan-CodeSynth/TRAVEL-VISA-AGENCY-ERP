export interface PaymentInvoiceRef {
  id: string;
  invoiceNumber: string;
  totalAmount: string;
  currencyCode: string;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  branchId: string;
  invoiceId: string;
  invoice?: PaymentInvoiceRef | null;
  customerId: string | null;
  amount: string;
  currencyCode: string;
  method: string;
  status: string;
  paidAt: string;
  reference: string | null;
  notes: string | null;
  isRefund: boolean;
  refundedAmount: string;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}
