import { useAuth } from "@/features/auth/hooks/use-auth";

/** Mirror of the server rule: fare managers (flights.create/edit) see base cost + margin. */
export function useCanSeeMargin(): boolean {
  const { permissions } = useAuth();
  return permissions.includes("flights.create") || permissions.includes("flights.edit");
}
