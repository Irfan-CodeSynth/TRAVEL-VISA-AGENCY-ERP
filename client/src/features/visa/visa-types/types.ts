export interface VisaTypeCountryRef {
  id: string;
  code: string;
  name: string;
  flagEmoji?: string | null;
}

export interface VisaType {
  id: string;
  countryId: string;
  country?: VisaTypeCountryRef | null;
  code: string;
  name: string;
  category: string | null;
  allowedStayDays: number | null;
  validityDays: number | null;
  processingDays: number | null;
  price: string | null;
  currencyCode: string;
  requirements: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
