import type { CommissionStatus, CommissionType } from "../shared/constants";

export interface CommissionAgentRef {
  id: string;
  name: string;
}

export interface Commission {
  id: string;
  commissionNumber: string;
  branchId: string;
  agentId: string;
  agent?: CommissionAgentRef | null;
  bookingId: string | null;
  booking?: { id: string; bookingNumber: string } | null;
  invoiceId: string | null;
  invoice?: { id: string; invoiceNumber: string } | null;
  type: CommissionType;
  rate: string | null;
  baseAmount: string;
  amount: string;
  currencyCode: string;
  status: CommissionStatus;
  notes: string | null;
  approvedByUserId: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}
