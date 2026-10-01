import type { AppointmentStatus, AppointmentType } from "../shared/constants";
import type { AppCustomerRef, AppVisaTypeRef } from "../applications/types";

export interface Appointment {
  id: string;
  type: AppointmentType;
  status: AppointmentStatus;
  subject: string;
  location: string | null;
  scheduledAt: string;
  durationMinutes: number | null;
  notes: string | null;
  rescheduleCount: number;
  branchId: string;
  applicationId: string | null;
  customerId: string | null;
  assignedToUserId: string | null;
  createdAt: string;
  application?: { id: string; applicationNumber: string; status: string; visaType?: { name: string } | null } | null;
  customer?: AppCustomerRef | null;
}

export type { AppVisaTypeRef };
