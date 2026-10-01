export interface Hotel {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  address: string | null;
  starRating: number | null;
  roomType: string | null;
  ratePerNight: string | null;
  currencyCode: string;
  roomsAvailable: number | null;
  contactPhone: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
