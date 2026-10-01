import { useQuery } from "@tanstack/react-query";
import { apiGetList } from "@/lib/api";
import { usePermission } from "@/hooks/use-permission";

export interface OptionUser {
  id: string;
  firstName: string;
  lastName: string | null;
  email?: string;
}

export interface OptionCountry {
  id: string;
  code: string;
  name: string;
  flagEmoji?: string | null;
}

export function fullName(p: { firstName: string; lastName?: string | null }) {
  return [p.firstName, p.lastName].filter(Boolean).join(" ");
}

export function useUserOptions() {
  const allowed = usePermission("users.view");
  return useQuery<OptionUser[]>({
    queryKey: ["reference", "users"],
    queryFn: async () => {
      const res = await apiGetList<OptionUser>("/users", { limit: 200 });
      return res.data;
    },
    enabled: allowed,
    staleTime: 1000 * 60 * 10,
  });
}

export function useCountryOptions() {
  return useQuery<OptionCountry[]>({
    queryKey: ["reference", "countries"],
    queryFn: async () => {
      const res = await apiGetList<OptionCountry>("/countries", { limit: 200, isActive: "true" });
      return res.data;
    },
    staleTime: 1000 * 60 * 30,
  });
}

export interface OptionCustomer {
  id: string;
  customerNumber: string;
  firstName: string;
  lastName: string | null;
  companyName: string | null;
}

export function useCustomerOptions() {
  const allowed = usePermission("customers.view");
  return useQuery<OptionCustomer[]>({
    queryKey: ["reference", "customers"],
    queryFn: async () => {
      const res = await apiGetList<OptionCustomer>("/customers", { page: 1, limit: 200 });
      return res.data;
    },
    enabled: allowed,
    staleTime: 1000 * 60 * 5,
  });
}

export interface OptionVisaType {
  id: string;
  code: string;
  name: string;
  country?: OptionCountry | null;
}

export function useVisaTypeOptions() {
  const allowed = usePermission("visa.view");
  return useQuery<OptionVisaType[]>({
    queryKey: ["reference", "visaTypes"],
    queryFn: async () => {
      const res = await apiGetList<OptionVisaType>("/visa-types", { page: 1, limit: 200, isActive: "true" });
      return res.data;
    },
    enabled: allowed,
    staleTime: 1000 * 60 * 5,
  });
}

export interface OptionAgent {
  id: string;
  name: string;
  company: string | null;
}

export function useAgentOptions() {
  const allowed = usePermission("agents.view");
  return useQuery<OptionAgent[]>({
    queryKey: ["reference", "agents"],
    queryFn: async () => {
      const res = await apiGetList<OptionAgent>("/agents", { page: 1, limit: 200 });
      return res.data;
    },
    enabled: allowed,
    staleTime: 1000 * 60 * 5,
  });
}

export interface OptionSupplier {
  id: string;
  name: string;
}

export function useSupplierOptions() {
  const allowed = usePermission("suppliers.view");
  return useQuery<OptionSupplier[]>({
    queryKey: ["reference", "suppliers"],
    queryFn: async () => {
      const res = await apiGetList<OptionSupplier>("/suppliers", { page: 1, limit: 200 });
      return res.data;
    },
    enabled: allowed,
    staleTime: 1000 * 60 * 5,
  });
}

export interface OptionBooking {
  id: string;
  bookingNumber: string;
}

export function useBookingOptions() {
  const allowed = usePermission("bookings.view");
  return useQuery<OptionBooking[]>({
    queryKey: ["reference", "bookings"],
    queryFn: async () => {
      const res = await apiGetList<OptionBooking>("/bookings", { page: 1, limit: 200 });
      return res.data;
    },
    enabled: allowed,
    staleTime: 1000 * 60 * 2,
  });
}

export interface OptionInvoice {
  id: string;
  invoiceNumber: string;
}

export function useInvoiceOptions() {
  const allowed = usePermission("invoices.view");
  return useQuery<OptionInvoice[]>({
    queryKey: ["reference", "invoices"],
    queryFn: async () => {
      const res = await apiGetList<OptionInvoice>("/invoices", { page: 1, limit: 200 });
      return res.data;
    },
    enabled: allowed,
    staleTime: 1000 * 60 * 2,
  });
}
