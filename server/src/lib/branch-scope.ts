const ADMIN_SCOPE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'];

/**
 * Decides the branchId filter for a list query.
 * Admin/branch-manager roles may pass ?branchId= (or see all branches when omitted);
 * every other user is locked to their own branch.
 */
export function resolveBranchScope(
  user: any,
  query: Record<string, unknown>
): { branchId?: string } {
  const roleNames: string[] = [
    ...(user?.userRoles?.map((ur: any) => ur.role?.name) ?? []),
    ...(user?.branchUserRoles?.map((bur: any) => bur.role?.name) ?? []),
  ];
  const isOverridden = roleNames.some((r) => ADMIN_SCOPE_ROLES.includes(r));

  if (isOverridden) {
    return query.branchId ? { branchId: String(query.branchId) } : {};
  }
  return { branchId: user?.branchId ?? '__no_branch__' };
}
