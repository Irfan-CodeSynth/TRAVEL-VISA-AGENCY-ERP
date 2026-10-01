import type { LeadSource } from "../shared/constants";

export type LeadStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL" | "WON" | "LOST";

export interface LeadPersonRef {
  id: string;
  firstName: string;
  lastName: string | null;
}

export interface LeadCountryRef {
  id: string;
  code: string;
  name: string;
  flagEmoji?: string | null;
}

export interface Lead {
  id: string;
  leadNumber: string;
  firstName: string;
  lastName: string | null;
  companyName: string | null;
  phone: string;
  email: string | null;
  whatsapp: string | null;
  source: LeadSource;
  status: LeadStatus;
  estimatedBudget: string | null;
  budgetCurrencyCode: string | null;
  servicesInterested: string | null;
  description: string | null;
  notes: string | null;
  lostReason: string | null;
  convertedAt: string | null;
  branchId: string;
  assignedToUserId: string | null;
  interestedDestinationId: string | null;
  createdAt: string;
  assignedToUser?: LeadPersonRef | null;
  interestedDestination?: LeadCountryRef | null;
  branch?: { id: string; name: string; code: string } | null;
}

export interface ConvertedCustomerRef {
  id: string;
  customerNumber: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
}

export interface LeadDetail extends Lead {
  convertedCustomer?: ConvertedCustomerRef | null;
  followUps?: unknown[];
}
