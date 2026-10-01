import { useAuth } from '../features/auth/hooks/use-auth';

export function usePermission(permission: string) {
  const { permissions } = useAuth();
  return permissions.includes(permission);
}

export function useAnyPermission(...permissionsList: string[]) {
  const { permissions } = useAuth();
  return permissionsList.some((p) => permissions.includes(p));
}
