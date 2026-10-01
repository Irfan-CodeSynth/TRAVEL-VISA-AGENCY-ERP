import type { LeadSource } from "../shared/constants";
import type { LeadPersonRef } from "../leads/types";

export type CustomerType = "INDIVIDUAL" | "COMPANY";
export type CustomerStatus = "ACTIVE" | "VIP" | "INACTIVE" | "BLACKLISTED";
export type Gender = "MALE" | "FEMALE" | "OTHER";

export interface Customer {
  id: string;
  customerNumber: string;
  customerType: CustomerType;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  nationalId: string | null;
  passportNumber: string | null;
  passportExpiry: string | null;
  gender: Gender | null;
  dateOfBirth: string | null;
  nationalityCountryId: string | null;
  occupation: string | null;
  city: string | null;
  address: string | null;
  status: CustomerStatus;
  source: LeadSource | null;
  notes: string | null;
  branchId: string;
  assignedToUserId: string | null;
  createdAt: string;
  assignedToUser?: LeadPersonRef | null;
  nationalityCountry?: { id: string; code: string; name: string; flagEmoji?: string | null } | null;
  branch?: { id: string; name: string; code: string } | null;
}

export interface CustomerSummary {
  customer: Customer;
  stats: {
    followUpsOpen: number;
    followUpsTotal: number;
  };
  recentFollowUps: Array<{
    id: string;
    type: string;
    subject: string;
    scheduledAt: string;
    status: string;
    priority: string;
  }>;
}
