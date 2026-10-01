import type { SupplierType } from "../shared/constants";

export interface Supplier {
  id: string;
  name: string;
  type: SupplierType;
  email: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  website: string | null;
  contactPerson: string | null;
  taxNumber: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
