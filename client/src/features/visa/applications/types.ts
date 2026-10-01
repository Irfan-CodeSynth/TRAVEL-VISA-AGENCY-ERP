import type { ApplicationStatus } from "../shared/constants";
import type { AppointmentType, AppointmentStatus } from "../shared/constants";

export interface AppCustomerRef {
  id: string;
  customerNumber: string;
  firstName: string;
  lastName: string | null;
  companyName: string | null;
  phone?: string;
  email?: string | null;
}

export interface AppCountryRef {
  id: string;
  code: string;
  name: string;
  flagEmoji?: string | null;
}

export interface AppVisaTypeRef {
  id: string;
  code: string;
  name: string;
  category?: string | null;
  country?: AppCountryRef | null;
}

export interface Application {
  id: string;
  applicationNumber: string;
  status: ApplicationStatus;
  applicantCount: number;
  submissionDate: string | null;
  decisionDate: string | null;
  referenceNumber: string | null;
  totalFees: string | null;
  currencyCode: string;
  notes: string | null;
  branchId: string;
  assignedToUserId: string | null;
  customerId: string;
  visaTypeId: string;
  createdAt: string;
  updatedAt: string;
  customer?: AppCustomerRef | null;
  visaType?: AppVisaTypeRef | null;
}

export interface ApplicationStatusLog {
  id: string;
  applicationId: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  note: string | null;
  changedByUserId: string | null;
  createdAt: string;
}

export interface AppointmentRef {
  id: string;
  type: AppointmentType;
  status: AppointmentStatus;
  subject: string;
  scheduledAt: string;
  location: string | null;
}

export interface ApplicationDetail extends Application {
  statusLogs: ApplicationStatusLog[];
  appointments: AppointmentRef[];
}

export type TimelineEvent =
  | { kind: "CREATED"; at: string; note: string }
  | { kind: "STATUS"; at: string; note: string | null; fromStatus: ApplicationStatus | null; toStatus: ApplicationStatus }
  | { kind: "APPOINTMENT"; at: string; appointment: AppointmentRef };

export interface TransitionInfo {
  current: ApplicationStatus;
  allowed: ApplicationStatus[];
}
