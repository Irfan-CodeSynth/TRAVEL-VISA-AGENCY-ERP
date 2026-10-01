import type { CommissionType } from "../shared/constants";

export interface Agent {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  contactPerson: string | null;
  commissionType: CommissionType;
  commissionRate: string | null;
  currencyCode: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { commissions: number };
}
