export function hasRole(userRoles: string[], allowedRoles: string[]): boolean {
  const allowed = new Set(
    allowedRoles.map((role) => role.trim().toLowerCase()),
  );
  return userRoles.some((role) => allowed.has(role.trim().toLowerCase()));
}
