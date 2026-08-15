"use client";

import { useMemo } from "react";
import { useSelector } from "react-redux";

import type { RootState } from "@/store/store";

export type ArchivedResource =
  | "user"
  | "role"
  | "permission"
  | "role-permission"
  | "employee"
  | "master-data"
  | "employee-leave-balance"
  | "shift-rule"
  | "employee-shift-rule"
  | "request-leave"
  | "overtime"
  | "leave-management"
  | "overtime-management"
  | "payroll"
  | "payroll-config";

export type ArchivedDataAccess = {
  canShowDeleted: boolean;
  canRestore: boolean;
  canPurge: boolean;
};

const SECURITY_RESOURCES = new Set<ArchivedResource>([
  "user",
  "role",
  "permission",
  "role-permission",
]);

const HR_OPERATIONAL_RESOURCES = new Set<ArchivedResource>([
  "employee",
  "master-data",
  "employee-leave-balance",
  "request-leave",
  "overtime",
  "leave-management",
  "overtime-management",
  "shift-rule",
  "employee-shift-rule",
]);

function hasRole(roles: string[], expected: string): boolean {
  return roles.some((role) => role.trim().toLowerCase() === expected);
}

export function resolveArchivedDataAccess(
  roles: string[],
  permissions: string[],
  resource: ArchivedResource,
): ArchivedDataAccess {
  const permissionSet = new Set(
    permissions.map((permission) => permission.toLowerCase()),
  );
  const isSuperadmin = hasRole(roles, "superadmin");
  const isHr = hasRole(roles, "hr");
  const roleAllowed =
    isSuperadmin || (isHr && HR_OPERATIONAL_RESOURCES.has(resource));
  const securityAllowed = !SECURITY_RESOURCES.has(resource) || isSuperadmin;
  const canRestore =
    roleAllowed && securityAllowed && permissionSet.has(`${resource}.restore`);
  const canPurge =
    roleAllowed && securityAllowed && permissionSet.has(`${resource}.purge`);

  return {
    canShowDeleted: roleAllowed && securityAllowed && (canRestore || canPurge),
    canRestore,
    canPurge,
  };
}

export function useArchivedDataAccess(
  resource: ArchivedResource,
): ArchivedDataAccess {
  const { role, permissions } = useSelector(
    (state: RootState) => state.profile,
  );

  return useMemo(
    () => resolveArchivedDataAccess(role, permissions, resource),
    [permissions, resource, role],
  );
}
