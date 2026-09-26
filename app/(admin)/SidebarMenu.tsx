"use client";
import { useI18n } from "@/app/i18n";
import { useCallback, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import ActiveLink from "./ActiveLinkProps";
import AppLogo from "../_components/sidebar-menu/AppLogo";
import { RootState } from "@/store/store";
import {
  normalizePermissionCode,
  toPermissionSet,
} from "@/app/utils/permission-utils";
type MenuItem = {
  href: string;
  label: string;
  icon: string;
  permission?: string;
  anyOf?: string[];
  superadminOnly?: boolean;
};
type MenuSection = {
  key: string;
  label: string;
  icon: string;
  items: MenuItem[];
};
type SettingSubMenu = {
  key: string;
  label: string;
  icon: string;
  items: MenuItem[];
};
const selfServiceItems: MenuItem[] = [
  {
    href: "/my-profile",
    label: "My Profile",
    icon: "pi-user",
    permission: "my-profile.read",
  },
  {
    href: "/my-attendance/mobile-attendance",
    label: "Web Attendance",
    icon: "pi-map-marker",
    permission: "mobile-attendance.create",
  },
  {
    href: "/my-attendance/attendance-history",
    label: "Attendance History",
    icon: "pi-history",
  },
  {
    href: "/request-leave",
    label: "Request Leave",
    icon: "pi-calendar",
    permission: "request-leave.read",
  },
  {
    href: "/overtime/request",
    label: "Overtime Request",
    icon: "pi-clock",
    permission: "overtime.read",
  },
  {
    href: "/my-payslips",
    label: "My Payslips",
    icon: "pi-wallet",
    permission: "payroll-payslip.self",
  },
  {
    href: "/my-lifecycle-tasks",
    label: "My Lifecycle Tasks",
    icon: "pi-list-check",
  },
  {
    href: "/my-performance",
    label: "My Performance",
    icon: "pi-chart-line",
    permission: "performance.read",
  },
];
const approvalItems: MenuItem[] = [
  {
    href: "/approval",
    label: "Approval Inbox",
    icon: "pi-inbox",
    permission: "approval.read",
  },
  {
    href: "/setting/approval-settings",
    label: "Approval Settings",
    icon: "pi-cog",
    permission: "approval.update",
  },
];
const employeeItems: MenuItem[] = [
  {
    href: "/employees",
    label: "Manage Employee",
    icon: "pi-users",
    permission: "employee.read",
  },
  {
    href: "/recruitment",
    label: "Recruitment",
    icon: "pi-briefcase",
    permission: "recruitment.read",
  },
  {
    href: "/performance",
    label: "Performance",
    icon: "pi-chart-line",
    anyOf: ["performance.manage", "approval.read"],
  },
  {
    href: "/training",
    label: "Training & Certification",
    icon: "pi-book",
    permission: "training.read",
  },
  {
    href: "/hr-analytics",
    label: "HR Analytics",
    icon: "pi-chart-bar",
    permission: "hr-analytics.read",
  },
  {
    href: "/leave-management",
    label: "Leave Management",
    icon: "pi-calendar",
    permission: "leave-management.read",
  },
  {
    href: "/overtime-management",
    label: "Overtime Management",
    icon: "pi-clock",
    permission: "overtime-management.read",
  },
  {
    href: "/employee-lifecycle",
    label: "Employee Lifecycle",
    icon: "pi-directions-alt",
    permission: "employee-lifecycle.read",
  },
  {
    href: "/assets",
    label: "Company Assets",
    icon: "pi-box",
    permission: "asset.read",
  },
  {
    href: "/employee-documents",
    label: "Employee Documents",
    icon: "pi-file-check",
    permission: "employee-document.read",
  },
];
const timeManagementItems: MenuItem[] = [
  {
    href: "/setting/employee-schedule",
    label: "Employee Schedule",
    icon: "pi-calendar-clock",
    anyOf: ["employee-shift-rule.read", "employee-shift-assignment.read"],
  },
  {
    href: "/attendance-log",
    label: "Attendance Log",
    icon: "pi-clock",
    permission: "attendance-log.read",
  },
  {
    href: "/attendance-summary",
    label: "Attendance Summary",
    icon: "pi-file-check",
    permission: "attendance-summary.read",
  },
];
const payrollItems: MenuItem[] = [
  {
    href: "/run-payroll",
    label: "Run Payroll",
    icon: "pi-calculator",
    permission: "payroll.read",
  },
];
const settingSubMenus: SettingSubMenu[] = [
  {
    key: "organization",
    label: "Organization",
    icon: "pi-building",
    items: [
      {
        href: "/setting/agency",
        label: "Agency",
        icon: "pi-building",
        permission: "master-data.read",
      },
      {
        href: "/setting/branch",
        label: "Branch",
        icon: "pi-sitemap",
        permission: "master-data.read",
      },
      {
        href: "/setting/department",
        label: "Department",
        icon: "pi-briefcase",
        permission: "master-data.read",
      },
      {
        href: "/setting/position",
        label: "Position",
        icon: "pi-user",
        permission: "master-data.read",
      },
    ],
  },
  {
    key: "master",
    label: "Master Data",
    icon: "pi-database",
    items: [
      {
        href: "/setting/country",
        label: "Country",
        icon: "pi-globe",
        permission: "master-data.read",
      },
      {
        href: "/setting/state",
        label: "Province",
        icon: "pi-map",
        permission: "master-data.read",
      },
      {
        href: "/setting/city",
        label: "City",
        icon: "pi-map-marker",
        permission: "master-data.read",
      },
      {
        href: "/setting/bank",
        label: "Bank",
        icon: "pi-credit-card",
        permission: "master-data.read",
      },
      {
        href: "/setting/document-type",
        label: "Document Type",
        icon: "pi-file",
        permission: "master-data.read",
      },
      {
        href: "/setting/employment-status",
        label: "Employment Status",
        icon: "pi-id-card",
        permission: "master-data.read",
      },
      {
        href: "/setting/identity-type",
        label: "Identity Type",
        icon: "pi-id-card",
        permission: "master-data.read",
      },
      {
        href: "/setting/relationship",
        label: "Relationship",
        icon: "pi-heart",
        permission: "master-data.read",
      },
    ],
  },
  {
    key: "attendance-setup",
    label: "Attendance Setup",
    icon: "pi-calendar-clock",
    items: [
      {
        href: "/setting/holiday",
        label: "Holiday",
        icon: "pi-calendar-times",
        permission: "master-data.read",
      },
      {
        href: "/setting/shift",
        label: "Shift",
        icon: "pi-calendar",
        permission: "master-data.read",
      },
      {
        href: "/setting/shift-rule",
        label: "Shift Rule",
        icon: "pi-calendar",
        permission: "shift-rule.read",
      },
      {
        href: "/setting/attendance",
        label: "Attendance Settings",
        icon: "pi-cog",
        permission: "attendance-summary.read",
      },
      {
        href: "/setting/fingerprint-scanner",
        label: "Fingerprint Devices",
        icon: "pi-box",
        permission: "master-data.read",
      },
    ],
  },
  {
    key: "system-operations",
    label: "System Operations",
    icon: "pi-cog",
    items: [
      {
        href: "/setting/background-jobs",
        label: "Background Jobs",
        icon: "pi-cog",
        permission: "background-job.read",
      },
      {
        href: "/setting/mobile-app",
        label: "Mobile App",
        icon: "pi-mobile",
        permission: "master-data.read",
      },
    ],
  },
  {
    key: "leave-setup",
    label: "Leave Setup",
    icon: "pi-calendar",
    items: [
      {
        href: "/setting/leave-type",
        label: "Leave Type",
        icon: "pi-calendar",
        permission: "master-data.read",
      },
    ],
  },
  {
    key: "payroll-configuration",
    label: "Payroll Configuration",
    icon: "pi-calculator",
    items: [
      {
        href: "/setting/payroll",
        label: "General Settings",
        icon: "pi-cog",
        permission: "payroll-config.read",
      },
      {
        href: "/setting/proration-method",
        label: "Proration Method",
        icon: "pi-sliders-h",
        permission: "payroll-config.read",
      },
      {
        href: "/setting/frequency",
        label: "Wage Basis",
        icon: "pi-calendar",
        permission: "payroll-config.read",
      },
      {
        href: "/setting/component-category",
        label: "Component Category",
        icon: "pi-tags",
        permission: "payroll-config.read",
      },
      {
        href: "/setting/calculation-method",
        label: "Calculation Method",
        icon: "pi-sliders-h",
        permission: "payroll-config.read",
      },
      {
        href: "/setting/payroll-formula",
        label: "Payroll Formula",
        icon: "pi-calculator",
        permission: "payroll-config.read",
      },
      {
        href: "/setting/income-component",
        label: "Income Component",
        icon: "pi-plus-circle",
        permission: "payroll-config.read",
      },
      {
        href: "/setting/deduction-component",
        label: "Deduction Component",
        icon: "pi-minus-circle",
        permission: "payroll-config.read",
      },
      {
        href: "/setting/holiday-position-incentive",
        label: "Holiday Position Incentive",
        icon: "pi-calendar-plus",
        permission: "payroll-config.read",
      },
      {
        href: "/setting/position-allowance",
        label: "Position Allowance",
        icon: "pi-briefcase",
        permission: "payroll-config.read",
      },
    ],
  },
  {
    key: "employee-lifecycle-configuration",
    label: "Employee Lifecycle Setup",
    icon: "pi-directions-alt",
    items: [
      {
        href: "/setting/employee-lifecycle",
        label: "Lifecycle Configuration",
        icon: "pi-list-check",
        permission: "employee-lifecycle.settings.read",
      },
    ],
  },
  {
    key: "communication",
    label: "Communication",
    icon: "pi-envelope",
    items: [
      {
        href: "/setting/email",
        label: "Email Configuration",
        icon: "pi-envelope",
        permission: "email_template.read",
        superadminOnly: true,
      },
    ],
  },
  {
    key: "user-management",
    label: "User Management",
    icon: "pi-users",
    items: [
      {
        href: "/setting/user",
        label: "Users",
        icon: "pi-user",
        permission: "user.read",
        superadminOnly: true,
      },
      {
        href: "/setting/role",
        label: "Roles",
        icon: "pi-users",
        permission: "role.read",
        superadminOnly: true,
      },
      {
        href: "/setting/permissions",
        label: "Permissions",
        icon: "pi-lock",
        permission: "permission.read",
        superadminOnly: true,
      },
      {
        href: "/setting/role-permissions",
        label: "Role Permissions",
        icon: "pi-key",
        permission: "role-permission.read",
        superadminOnly: true,
      },
    ],
  },
];
const topMenuSections: MenuSection[] = [
  {
    key: "self-service",
    label: "Self Service",
    icon: "pi-user",
    items: selfServiceItems,
  },
  {
    key: "approval",
    label: "Approval",
    icon: "pi-inbox",
    items: approvalItems,
  },
  {
    key: "employee-management",
    label: "Employee Management",
    icon: "pi-users",
    items: employeeItems,
  },
  {
    key: "time-attendance",
    label: "Time & Attendance",
    icon: "pi-calendar-clock",
    items: timeManagementItems,
  },
  {
    key: "payroll",
    label: "Payroll",
    icon: "pi-calculator",
    items: payrollItems,
  },
];
const menuTranslationKeys: Record<string, string> = {
  "My Profile": "nav.myProfile",
  "Web Attendance": "nav.webAttendance",
  "Attendance History": "nav.attendanceHistory",
  "Request Leave": "nav.requestLeave",
  "Overtime Request": "nav.overtimeRequest",
  "My Payslips": "nav.myPayslips",
  "My Lifecycle Tasks": "nav.myLifecycleTasks",
  "My Performance": "nav.myPerformance",
  "Approval Inbox": "nav.approvalInbox",
  "Approval Settings": "nav.approvalSettings",
  "Manage Employee": "nav.manageEmployee",
  Recruitment: "nav.recruitment",
  Attendance: "nav.attendance",
  Leave: "nav.leave",
  Overtime: "nav.overtime",
  Performance: "nav.performance",
  "Training & Certification": "nav.trainingCertification",
  "HR Analytics": "nav.hrAnalytics",
  "Leave Management": "nav.leaveManagement",
  "Overtime Management": "nav.overtimeManagement",
  "Employee Lifecycle": "nav.employeeLifecycle",
  "Company Assets": "nav.companyAssets",
  "Employee Documents": "nav.employeeDocuments",
  "Attendance Log": "nav.attendanceLog",
  "Attendance Summary": "nav.attendanceSummary",
  "Run Payroll": "nav.runPayroll",
  "Mobile App": "nav.mobileApp",
  "Self Service": "nav.selfService",
  Approval: "nav.approval",
  "Employee Management": "nav.employeeManagement",
  "Time & Attendance": "nav.timeAttendance",
  Payroll: "nav.payroll",
  Settings: "nav.settings",
  Summary: "nav.summary",
  "Main Menu": "nav.mainMenu",
  Configuration: "nav.configuration",
  Dashboard: "nav.dashboard",
  Organization: "nav.organization",
  "Master Data": "nav.masterData",
  "Attendance Setup": "nav.attendanceSetup",
  "System Operations": "nav.systemOperations",
  "Leave Setup": "nav.leaveSetup",
  "Payroll Configuration": "nav.payrollConfiguration",
  "Employee Lifecycle Setup": "nav.employeeLifecycleSetup",
  Communication: "nav.communication",
  "User Management": "nav.userManagement",
  Agency: "nav.agency",
  Branch: "nav.branch",
  Department: "nav.department",
  Position: "nav.position",
  Country: "nav.country",
  Province: "nav.province",
  City: "nav.city",
  Bank: "nav.bank",
  "Document Type": "nav.documentType",
  "Employment Status": "nav.employmentStatus",
  "Identity Type": "nav.identityType",
  Relationship: "nav.relationship",
  Holiday: "nav.holiday",
  Shift: "nav.shift",
  "Shift Rule": "nav.shiftRule",
  "Employee Schedule": "nav.employeeSchedule",
  "Attendance Settings": "nav.attendanceSettings",
  "Fingerprint Devices": "nav.fingerprintDevices",
  "Background Jobs": "nav.backgroundJobs",
  "Leave Type": "nav.leaveType",
  "General Settings": "nav.generalSettings",
  "Proration Method": "nav.prorationMethod",
  "Wage Basis": "nav.wageBasis",
  "Component Category": "nav.componentCategory",
  "Calculation Method": "nav.calculationMethod",
  "Payroll Formula": "nav.payrollFormula",
  "Income Component": "nav.incomeComponent",
  "Deduction Component": "nav.deductionComponent",
  "Holiday Position Incentive": "nav.holidayPositionIncentive",
  "Position Allowance": "nav.positionAllowance",
  "Lifecycle Configuration": "nav.lifecycleConfiguration",
  "Email Configuration": "nav.emailConfiguration",
  Users: "nav.users",
  Roles: "nav.roles",
  Permissions: "nav.permissions",
  "Role Permissions": "nav.rolePermissions",
};
const getProfilePermissions = (profileState: unknown): string[] => {
  const profile = profileState as { permissions?: unknown };
  if (!Array.isArray(profile.permissions)) {
    return [];
  }
  return profile.permissions.filter(
    (permission): permission is string => typeof permission === "string",
  );
};
export default function SidebarMenu({
  onClose,
}: {
  onClose?: () => void;
} = {}) {
  const { t } = useI18n();
  const pathname = usePathname();
  const profileState = useSelector((state: RootState) => state.profile);
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const [openSubMenuKey, setOpenSubMenuKey] = useState<string | null>(null);
  const translateMenuLabel = (label: string) =>
    t(menuTranslationKeys[label] ?? label);
  const permissionSet = useMemo(() => {
    return toPermissionSet(getProfilePermissions(profileState));
  }, [profileState]);
  const isSuperadmin = useMemo(
    () =>
      profileState.role.some(
        (role) => role.trim().toLowerCase() === "superadmin",
      ),
    [profileState.role],
  );
  const hasPermission = useCallback(
    (permission?: string, superadminOnly = false, anyOf?: string[]) => {
      if (superadminOnly && !isSuperadmin) {
        return false;
      }
      if (anyOf && anyOf.length > 0) {
        return anyOf.some((item) =>
          permissionSet.has(normalizePermissionCode(item)),
        );
      }
      if (!permission) {
        return true;
      }
      return permissionSet.has(normalizePermissionCode(permission));
    },
    [isSuperadmin, permissionSet],
  );
  const getVisibleItems = useCallback(
    (items: MenuItem[]) =>
      items.filter((item) =>
        hasPermission(item.permission, item.superadminOnly, item.anyOf),
      ),
    [hasPermission],
  );
  const visibleTopMenuSections = useMemo(() => {
    return topMenuSections
      .map((section) => ({ ...section, items: getVisibleItems(section.items) }))
      .filter((section) => section.items.length > 0);
  }, [getVisibleItems]);
  const visibleSettingSubMenus = useMemo(() => {
    return settingSubMenus
      .map((submenu) => ({ ...submenu, items: getVisibleItems(submenu.items) }))
      .filter((submenu) => submenu.items.length > 0);
  }, [getVisibleItems]);
  const isPathActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };
  const hasActiveItems = (items: MenuItem[]) => {
    return items.some((item) => isPathActive(item.href));
  };
  const hasActiveSettingItems = (items: SettingSubMenu[]) => {
    return items.some((item) => hasActiveItems(item.items));
  };
  const isTopMenuOpen = (key: string, items: MenuItem[]) => {
    return openMenuKey === key || hasActiveItems(items);
  };
  const isSubMenuOpen = (key: string, items: MenuItem[]) => {
    return openSubMenuKey === key || hasActiveItems(items);
  };
  const toggleMenu = (key: string) => {
    setOpenMenuKey((current) => (current === key ? null : key));
  };
  const toggleSubMenu = (key: string) => {
    setOpenSubMenuKey((current) => (current === key ? null : key));
  };
  const topButtonClass = (isOpen: boolean) =>
    `flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${isOpen ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"}`;
  const submenuButtonClass = (isOpen: boolean) =>
    `flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${isOpen ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`;
  const menuLinkClass =
    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900";
  const menuLinkActiveClass =
    "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100";
  const childLinkClass =
    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900";
  const childLinkActiveClass =
    "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100";
  const renderLinkItem = (item: MenuItem) => {
    return (
      <li key={item.href}>
        {" "}
        <ActiveLink
          href={item.href}
          className={childLinkClass}
          activeClassName={childLinkActiveClass}
          exact={false}
        >
          {" "}
          <i className={`pi ${item.icon} text-sm`} />{" "}
          <span className="truncate">
            {translateMenuLabel(item.label)}
          </span>{" "}
        </ActiveLink>{" "}
      </li>
    );
  };
  const renderLinkList = (items: MenuItem[]) => {
    return items.map((item) => renderLinkItem(item));
  };
  const renderTopSection = (section: MenuSection) => {
    const isOpen = isTopMenuOpen(section.key, section.items);
    return (
      <li key={section.key} className="space-y-1">
        {" "}
        <button
          type="button"
          className={topButtonClass(isOpen)}
          onClick={() => toggleMenu(section.key)}
        >
          {" "}
          <span className="flex items-center gap-3">
            {" "}
            <i className={`pi ${section.icon} text-sm`} />{" "}
            <span>{translateMenuLabel(section.label)}</span>{" "}
          </span>{" "}
          <i
            className={`pi ${isOpen ? "pi-chevron-down" : "pi-chevron-right"} text-xs text-slate-400`}
          />{" "}
        </button>{" "}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "mt-2 max-h-[900px] opacity-100" : "max-h-0 opacity-0"}`}
        >
          {" "}
          <ul className="space-y-1 pl-3">
            {renderLinkList(section.items)}
          </ul>{" "}
        </div>{" "}
      </li>
    );
  };
  const isDashboardVisible = hasPermission("dashboard.read");
  const isMainMenuVisible = visibleTopMenuSections.length > 0;
  const isSettingVisible = visibleSettingSubMenus.length > 0;
  const isSettingOpen =
    openMenuKey === "setting" || hasActiveSettingItems(visibleSettingSubMenus);
  const settingContent = (
    <li className="space-y-1">
      {" "}
      <button
        type="button"
        className={topButtonClass(isSettingOpen)}
        onClick={() => toggleMenu("setting")}
      >
        {" "}
        <span className="flex items-center gap-3">
          {" "}
          <i className="pi pi-cog text-sm" />{" "}
          <span>{translateMenuLabel("Settings")}</span>{" "}
        </span>{" "}
        <i
          className={`pi ${isSettingOpen ? "pi-chevron-down" : "pi-chevron-right"} text-xs text-slate-400`}
        />{" "}
      </button>{" "}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isSettingOpen ? "mt-2 max-h-[2600px] opacity-100" : "max-h-0 opacity-0"}`}
      >
        {" "}
        <ul className="space-y-1 pl-3">
          {" "}
          {visibleSettingSubMenus.map((submenu) => {
            const isOpen = isSubMenuOpen(submenu.key, submenu.items);
            return (
              <li key={submenu.key} className="space-y-1">
                {" "}
                <button
                  type="button"
                  className={submenuButtonClass(isOpen)}
                  onClick={() => toggleSubMenu(submenu.key)}
                >
                  {" "}
                  <span className="flex items-center gap-3">
                    {" "}
                    <i className={`pi ${submenu.icon} text-sm`} />{" "}
                    <span>{translateMenuLabel(submenu.label)}</span>{" "}
                  </span>{" "}
                  <i
                    className={`pi ${isOpen ? "pi-chevron-down" : "pi-chevron-right"} text-xs text-slate-400`}
                  />{" "}
                </button>{" "}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "mt-2 max-h-[1000px] opacity-100" : "max-h-0 opacity-0"}`}
                >
                  {" "}
                  <ul className="space-y-1 pl-4">
                    {" "}
                    {renderLinkList(submenu.items)}{" "}
                  </ul>{" "}
                </div>{" "}
              </li>
            );
          })}{" "}
        </ul>{" "}
      </div>{" "}
    </li>
  );
  return (
    <div className="flex h-full w-full flex-col bg-white">
      {" "}
      <div className="relative flex shrink-0 items-center justify-center border-b border-slate-200 px-4 py-3.5">
        <AppLogo />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label={t("common.actions.close") || "Close menu"}
          >
            <i className="pi pi-times text-sm" />
          </button>
        )}
      </div>{" "}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {" "}
        <ul className="m-0 list-none space-y-2 p-0">
          {" "}
          {isDashboardVisible && (
            <li className="space-y-2 pb-1">
              {" "}
              <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                {" "}
                {translateMenuLabel("Summary")}{" "}
              </p>{" "}
              <ActiveLink
                href="/dashboard"
                className={menuLinkClass}
                activeClassName={menuLinkActiveClass}
                exact={false}
              >
                {" "}
                <i className="pi pi-home text-sm" />{" "}
                <span>{translateMenuLabel("Dashboard")}</span>{" "}
              </ActiveLink>{" "}
            </li>
          )}{" "}
          {isMainMenuVisible && (
            <>
              {" "}
              <li className="pt-1">
                {" "}
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {" "}
                  {translateMenuLabel("Main Menu")}{" "}
                </p>{" "}
              </li>{" "}
              {visibleTopMenuSections.map((section) =>
                renderTopSection(section),
              )}{" "}
            </>
          )}{" "}
          {isSettingVisible && (
            <>
              {" "}
              <li className="pt-2">
                {" "}
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {" "}
                  {translateMenuLabel("Configuration")}{" "}
                </p>{" "}
              </li>{" "}
              {settingContent}{" "}
            </>
          )}{" "}
        </ul>{" "}
      </div>{" "}
    </div>
  );
}
