export interface TravelPackage {
  id: string;
  name: string;
  code: string | null;
  type: string | null;
  destination: string | null;
  durationDays: number | null;
  price: string | null;
  currencyCode: string;
  includes: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
