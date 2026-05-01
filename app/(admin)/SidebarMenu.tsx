"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

import ActiveLink from "./ActiveLinkProps";
import AppLogo from "../_components/sidebar-menu/AppLogo";
import Can from "../_components/CanPermission";

type MenuItem = {
  href: string;
  label: string;
  icon: string;
  permission?: string;
};

type MenuSection = {
  key: string;
  label: string;
  icon: string;
  permission?: string;
  items: MenuItem[];
};

type SettingSubMenu = {
  key: string;
  label: string;
  icon: string;
  permission?: string;
  items: MenuItem[];
};

const selfServiceItems: MenuItem[] = [
  {
    href: "/my-attendance/mobile-attendance",
    label: "Mobile Attendance",
    icon: "pi-map-marker",
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
    // permission: "leave.read",
  },
  {
    href: "/overtime/request",
    label: "Overtime Request",
    icon: "pi-clock",
    // permission: "overtime.read",
  },
];

const employeeItems: MenuItem[] = [
  {
    href: "/employees",
    label: "Employees",
    icon: "pi-users",
    // permission: "employee.read",
  },
];

const timeManagementItems: MenuItem[] = [
  {
    href: "/attendance-log",
    label: "Attendance Log",
    icon: "pi-clock",
    // permission: "attendance.manage",
  },
  {
    href: "/attendance-summary",
    label: "Attendance Summary",
    icon: "pi-file-check",
    // permission: "attendance.manage",
  },
];

const payrollItems: MenuItem[] = [
  {
    href: "/run-payroll",
    label: "Run Payroll",
    icon: "pi-calculator",
    // permission: "payroll.read",
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
      },
      {
        href: "/setting/branch",
        label: "Branch",
        icon: "pi-sitemap",
      },
      {
        href: "/setting/department",
        label: "Department",
        icon: "pi-briefcase",
      },
      {
        href: "/setting/position",
        label: "Position",
        icon: "pi-user",
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
      },
      {
        href: "/setting/state",
        label: "Province",
        icon: "pi-map",
      },
      {
        href: "/setting/city",
        label: "City",
        icon: "pi-map-marker",
      },
      {
        href: "/setting/bank",
        label: "Bank",
        icon: "pi-credit-card",
      },
      {
        href: "/setting/document-type",
        label: "Document Type",
        icon: "pi-file",
      },
      {
        href: "/setting/employment-status",
        label: "Employment Status",
        icon: "pi-id-card",
      },
      {
        href: "/setting/identity-type",
        label: "Identity Type",
        icon: "pi-id-card",
      },
      {
        href: "/setting/relationship",
        label: "Relationship",
        icon: "pi-heart",
      },
    ],
  },
  {
    key: "time-attendance-setup",
    label: "Time & Attendance Setup",
    icon: "pi-calendar-clock",
    items: [
      {
        href: "/setting/shift",
        label: "Shift",
        icon: "pi-calendar",
      },
      {
        href: "/setting/shift-rule",
        label: "Shift Rule",
        icon: "pi-calendar",
      },
      {
        href: "/setting/employee-shift-rule",
        label: "Employee Shift Rule",
        icon: "pi-list",
      },
      {
        href: "/setting/employee-shift-assignment",
        label: "Employee Shift Assignment",
        icon: "pi-calendar-plus",
      },
    ],
  },
  {
    key: "fingerprint",
    label: "Fingerprint",
    icon: "pi-id-card",
    items: [
      {
        href: "/setting/fingerprint-scanner",
        label: "Fingerprint Scanner",
        icon: "pi-box",
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
      },
    ],
  },
  {
    key: "payroll-configuration",
    label: "Payroll Configuration",
    icon: "pi-calculator",
    items: [
      {
        href: "/setting/payroll-formula",
        label: "Payroll Formula",
        icon: "pi-calculator",
      },
      {
        href: "/setting/income-component",
        label: "Income Component",
        icon: "pi-plus-circle",
      },
      {
        href: "/setting/deduction-component",
        label: "Deduction Component",
        icon: "pi-minus-circle",
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
      },
      {
        href: "/setting/role",
        label: "Roles",
        icon: "pi-users",
      },
      {
        href: "/setting/permissions",
        label: "Permissions",
        icon: "pi-lock",
      },
      {
        href: "/setting/role-permissions",
        label: "Role Permissions",
        icon: "pi-key",
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
    key: "employee-management",
    label: "Employee Management",
    icon: "pi-users",
    items: employeeItems,
  },
  {
    key: "time-management",
    label: "Time Management",
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

export default function SidebarMenu() {
  const pathname = usePathname();

  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const [openSubMenuKey, setOpenSubMenuKey] = useState<string | null>(null);

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
    `flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${isOpen
      ? "bg-slate-100 text-slate-900"
      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
    }`;

  const submenuButtonClass = (isOpen: boolean) =>
    `flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${isOpen
      ? "bg-slate-100 text-slate-900"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  const menuLinkClass =
    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900";

  const menuLinkActiveClass =
    "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100";

  const childLinkClass =
    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900";

  const childLinkActiveClass =
    "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100";

  const renderLinkItem = (item: MenuItem) => {
    const linkContent = (
      <li key={item.href}>
        <ActiveLink
          href={item.href}
          className={childLinkClass}
          activeClassName={childLinkActiveClass}
          exact={false}
        >
          <i className={`pi ${item.icon} text-sm`} />
          <span className="truncate">{item.label}</span>
        </ActiveLink>
      </li>
    );

    if (item.permission) {
      return (
        <Can key={item.href} allOf={[item.permission]}>
          {linkContent}
        </Can>
      );
    }

    return linkContent;
  };

  const renderLinkList = (items: MenuItem[]) => {
    return items.map((item) => renderLinkItem(item));
  };

  const renderTopSection = (section: MenuSection) => {
    const isOpen = isTopMenuOpen(section.key, section.items);

    const sectionContent = (
      <li key={section.key} className="space-y-1">
        <button
          type="button"
          className={topButtonClass(isOpen)}
          onClick={() => toggleMenu(section.key)}
        >
          <span className="flex items-center gap-3">
            <i className={`pi ${section.icon} text-sm`} />
            <span>{section.label}</span>
          </span>

          <i
            className={`pi ${isOpen ? "pi-chevron-down" : "pi-chevron-right"
              } text-xs text-slate-400`}
          />
        </button>

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "mt-2 max-h-[700px] opacity-100" : "max-h-0 opacity-0"
            }`}
        >
          <ul className="space-y-1 pl-3">{renderLinkList(section.items)}</ul>
        </div>
      </li>
    );

    if (section.permission) {
      return (
        <Can key={section.key} allOf={[section.permission]}>
          {sectionContent}
        </Can>
      );
    }

    return sectionContent;
  };

  const isSettingOpen =
    openMenuKey === "setting" ||
    pathname.startsWith("/setting") ||
    hasActiveSettingItems(settingSubMenus);

  const settingContent = (
    <li className="space-y-1">
      <button
        type="button"
        className={topButtonClass(isSettingOpen)}
        onClick={() => toggleMenu("setting")}
      >
        <span className="flex items-center gap-3">
          <i className="pi pi-cog text-sm" />
          <span>Settings</span>
        </span>

        <i
          className={`pi ${isSettingOpen ? "pi-chevron-down" : "pi-chevron-right"
            } text-xs text-slate-400`}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isSettingOpen ? "mt-2 max-h-[2600px] opacity-100" : "max-h-0 opacity-0"
          }`}
      >
        <ul className="space-y-1 pl-3">
          {settingSubMenus.map((submenu) => {
            const isOpen = isSubMenuOpen(submenu.key, submenu.items);

            const submenuContent = (
              <li key={submenu.key} className="space-y-1">
                <button
                  type="button"
                  className={submenuButtonClass(isOpen)}
                  onClick={() => toggleSubMenu(submenu.key)}
                >
                  <span className="flex items-center gap-3">
                    <i className={`pi ${submenu.icon} text-sm`} />
                    <span>{submenu.label}</span>
                  </span>

                  <i
                    className={`pi ${isOpen ? "pi-chevron-down" : "pi-chevron-right"
                      } text-xs text-slate-400`}
                  />
                </button>

                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen
                    ? "mt-2 max-h-[1000px] opacity-100"
                    : "max-h-0 opacity-0"
                    }`}
                >
                  <ul className="space-y-1 pl-4">
                    {renderLinkList(submenu.items)}
                  </ul>
                </div>
              </li>
            );

            if (submenu.permission) {
              return (
                <Can key={submenu.key} allOf={[submenu.permission]}>
                  {submenuContent}
                </Can>
              );
            }

            return submenuContent;
          })}
        </ul>
      </div>
    </li>
  );

  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="shrink-0 border-b border-slate-200 px-4 py-4">
        <AppLogo />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <ul className="m-0 list-none space-y-2 p-0">
          <Can allOf={["dashboard.read"]}>
            <li className="space-y-2 pb-1">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Summary
              </p>

              <ActiveLink
                href="/dashboard"
                className={menuLinkClass}
                activeClassName={menuLinkActiveClass}
                exact={false}
              >
                <i className="pi pi-home text-sm" />
                <span>Dashboard</span>
              </ActiveLink>
            </li>
          </Can>

          <li className="pt-1">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Main Menu
            </p>
          </li>

          {topMenuSections.map((section) => renderTopSection(section))}

          <li className="pt-2">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Configuration
            </p>
          </li>

          <Can allOf={["setting.read"]}>{settingContent}</Can>
        </ul>
      </div>
    </div>
  );
}