import { usePermission } from '../../hooks/use-permission';

interface PermissionGateProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const hasPermission = usePermission(permission);
  if (!hasPermission) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
