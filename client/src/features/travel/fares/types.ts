export interface Airport {
  id: string;
  iataCode: string;
  name: string;
  city: string | null;
  country: string | null;
  isActive: boolean;
}

export interface Airline {
  id: string;
  code: string;
  name: string;
  country: string | null;
  defaultMarginType: "PERCENT" | "FLAT" | null;
  defaultMarginValue: string | null;
  isActive: boolean;
}

export interface FlightFare {
  id: string;
  airlineId: string;
  airline: Airline;
  flightNumber: string;
  originAirportId: string;
  originAirport: Airport;
  destinationAirportId: string;
  destinationAirport: Airport;
  departureTime: string;
  arrivalTime: string | null;
  cabinClass: "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";
  currencyCode: string;
  taxPercent: string;
  seatsTotal: number;
  seatsBooked: number;
  seatsLeft: number | null;
  sellingPrice: number;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Only present for manager roles (SUPER_ADMIN, ADMIN, BRANCH_MANAGER, ACCOUNTANT)
  baseFare?: string;
  marginType?: "PERCENT" | "FLAT" | null;
  marginValue?: number | null;
  marginApplied?: number;
}
