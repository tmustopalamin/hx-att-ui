export function hasRole(userRoles: string[], allowedRoles: string[]): boolean {
  console.log(userRoles, allowedRoles)
  return userRoles.some(role => allowedRoles.includes(role));
}