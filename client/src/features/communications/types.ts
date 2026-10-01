import type { Channel, CommDirection, CommStatus } from "./shared/constants";

export interface Communication {
  id: string;
  branchId: string;
  channel: Channel;
  direction: CommDirection;
  subject: string;
  body: string | null;
  status: CommStatus;
  occurredAt: string;
  customerId: string | null;
  customer?: { id: string; firstName: string; lastName: string | null; companyName: string | null } | null;
  leadId: string | null;
  lead?: { id: string; leadNumber: string; firstName: string; lastName: string | null } | null;
  applicationId: string | null;
  application?: { id: string; applicationNumber: string } | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}
