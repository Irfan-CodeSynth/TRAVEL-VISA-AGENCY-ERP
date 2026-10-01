export interface Flight {
  id: string;
  airline: string;
  flightNumber: string;
  originCity: string | null;
  originAirport: string | null;
  destinationCity: string | null;
  destinationAirport: string | null;
  departureTime: string | null;
  arrivalTime: string | null;
  classType: string | null;
  baseFare: string | null;
  currencyCode: string;
  seatsAvailable: number | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
