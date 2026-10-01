import type { FollowUpStatus, FollowUpType, FollowUpPriority } from "./constants";

export interface FollowUp {
  id: string;
  type: FollowUpType;
  subject: string;
  notes: string | null;
  scheduledAt: string;
  completedAt: string | null;
  status: FollowUpStatus;
  priority: FollowUpPriority;
  branchId: string;
  customerId: string | null;
  leadId: string | null;
  assignedToUserId: string | null;
  createdAt: string;
  assignedToUser?: { id: string; firstName: string; lastName: string | null } | null;
  customer?: {
    id: string;
    customerNumber: string;
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
    phone: string;
  } | null;
  lead?: {
    id: string;
    leadNumber: string;
    firstName: string;
    lastName: string | null;
    companyName: string | null;
    phone: string;
  } | null;
}
