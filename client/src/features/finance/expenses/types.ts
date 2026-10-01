import type { ExpenseStatus } from "../shared/constants";

export interface Expense {
  id: string;
  expenseNumber: string;
  branchId: string;
  category: string;
  supplierId: string | null;
  title: string | null;
  amount: string;
  currencyCode: string;
  expenseDate: string;
  status: ExpenseStatus;
  paymentMethod: string | null;
  description: string | null;
  receiptUrl: string | null;
  approvedByUserId: string | null;
  approvedAt: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}
