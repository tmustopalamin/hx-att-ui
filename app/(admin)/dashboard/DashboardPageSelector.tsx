"use client";

import { useMemo } from "react";
import { useSelector } from "react-redux";

import { RootState } from "@/store/store";
import DashboardPageComponent from "./DashboardPageComponent";
import EmployeeDashboardPageComponent from "./EmployeeDashboardPageComponent";

const getProfilePermissions = (profileState: unknown): string[] => {
    const profile = profileState as { permissions?: unknown };

    if (!Array.isArray(profile.permissions)) {
        return [];
    }

    return profile.permissions.filter(
        (permission): permission is string => typeof permission === "string"
    );
};

const getProfileRoles = (profileState: unknown): string[] => {
    const profile = profileState as { role?: unknown; roles?: unknown };

    if (Array.isArray(profile.role)) {
        return profile.role.filter((role): role is string => typeof role === "string");
    }

    if (Array.isArray(profile.roles)) {
        return profile.roles.filter((role): role is string => typeof role === "string");
    }

    return [];
};

const DashboardPageSelector = () => {
    const profileState = useSelector((state: RootState) => state.profile);

    const permissionSet = useMemo(() => {
        return new Set(getProfilePermissions(profileState));
    }, [profileState]);

    const roleSet = useMemo(() => {
        return new Set(getProfileRoles(profileState).map((role) => role.toLowerCase()));
    }, [profileState]);

    // Jangan pakai dashboard.read di sini.
    // dashboard.read boleh dipakai semua user untuk akses menu dashboard.
    // Penentu admin dashboard harus permission yang memang bersifat admin/HR/management.
    const hasAdminRole =
        roleSet.has("admin") ||
        roleSet.has("superadmin") ||
        roleSet.has("developer");

    const hasAdminPermission =
        permissionSet.has("employee.read") ||
        permissionSet.has("attendance-summary.read") ||
        permissionSet.has("attendance-log.read") ||
        permissionSet.has("leave-management.read") ||
        permissionSet.has("overtime-management.read") ||
        permissionSet.has("master-data.read") ||
        permissionSet.has("user.read") ||
        permissionSet.has("role.read") ||
        permissionSet.has("permission.read") ||
        permissionSet.has("role-permission.read");

    const isAdminDashboard = hasAdminRole || hasAdminPermission;

    if (isAdminDashboard) {
        return <DashboardPageComponent />;
    }

    return <EmployeeDashboardPageComponent />;
};

export default DashboardPageSelector;