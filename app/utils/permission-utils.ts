/**
 * Permission codes are exchanged between Casbin, the API, Redux, and the
 * client-side menu.  Keep one canonical representation at the UI boundary so
 * a legacy permission stored with different casing cannot hide a valid menu
 * or action button.
 */
export const normalizePermissionCode = (permission: string): string =>
  permission.trim().toLowerCase();

export const normalizePermissionList = (
  permissions: readonly string[],
): string[] =>
  Array.from(
    new Set(
      permissions
        .filter((permission) => typeof permission === "string")
        .map(normalizePermissionCode)
        .filter((permission) => permission.length > 0),
    ),
  );

export const toPermissionSet = (
  permissions: readonly string[],
): ReadonlySet<string> => new Set(normalizePermissionList(permissions));

export const hasPermission = (
  permissions: readonly string[],
  requiredPermission?: string,
): boolean => {
  if (!requiredPermission) {
    return true;
  }

  return toPermissionSet(permissions).has(
    normalizePermissionCode(requiredPermission),
  );
};

export const hasAnyPermission = (
  permissions: readonly string[],
  requiredPermissions: readonly string[],
): boolean =>
  requiredPermissions.some((permission) =>
    hasPermission(permissions, permission),
  );

export const hasAllPermissions = (
  permissions: readonly string[],
  requiredPermissions: readonly string[],
): boolean =>
  requiredPermissions.every((permission) =>
    hasPermission(permissions, permission),
  );
