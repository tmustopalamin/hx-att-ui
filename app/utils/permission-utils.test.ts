import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  normalizePermissionList,
} from "./permission-utils";

describe("permission-utils", () => {
  const permissions = [" Dashboard.Read ", "APPROVAL.READ", "approval.approve"];

  it("normalizes and de-duplicates permission codes", () => {
    expect(normalizePermissionList([...permissions, "dashboard.read"])).toEqual(
      ["dashboard.read", "approval.read", "approval.approve"],
    );
  });

  it("matches permission codes case-insensitively", () => {
    expect(hasPermission(permissions, "dashboard.read")).toBe(true);
    expect(hasPermission(permissions, "approval.reject")).toBe(false);
    expect(
      hasAnyPermission(permissions, ["approval.reject", "approval.approve"]),
    ).toBe(true);
    expect(
      hasAllPermissions(permissions, ["dashboard.read", "approval.read"]),
    ).toBe(true);
  });
});
