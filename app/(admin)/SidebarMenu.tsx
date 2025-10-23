"use client";

import { useState } from "react";
import ActiveLink from "./ActiveLinkProps";
import { usePathname } from "next/navigation";
import AppLogo from "../_components/sidebar-menu/AppLogo";

export default function Sidebar() {
  const pathname = usePathname();

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);

  const toggleMenu = (menu: string) => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  const toggleSubMenu = (submenu: string) => {
    setOpenSubMenu(openSubMenu === submenu ? null : submenu);
  };

  return (
    <div className="flex flex-col gap-5 h-screen pb-5 w-full">
      {/* Logo */}
      <AppLogo />

      {/* Menu Items */}
      <div className="flex-1 overflow-y-auto">
        <ul className="list-none">

          {/* Summary */}
          <li>
            <div className="text-[.850rem] font-bold uppercase text-blue-700 py-[1rem] px-[2rem]">
              Summary
            </div>
            <ul>
              <li>
                <ActiveLink
                  href="/dashboard"
                  className="flex items-center py-[.75rem] px-[2rem] hover:bg-gray-100"
                  activeClassName="bg-gray-200"
                  exact={false}
                >
                  <i className="mr-[.5rem] pi pi-home text-blue-700"></i>
                  <span className="text-[.857rem]">Dashboard</span>
                </ActiveLink>
              </li>
            </ul>
          </li>

          {/* My Attendance */}
          <li>
            <div
              className="text-[.850rem] font-bold uppercase text-blue-700 py-[1rem] px-[2rem] flex justify-between gap-2 items-center cursor-pointer"
              onClick={() => toggleMenu("gps-photo-tracker")}
            >
              My Attendance
              <i
                className={`pi ${openMenu === "gps-photo-tracker" || pathname.startsWith("/gps-photo-tracker")
                  ? "pi-chevron-down"
                  : "pi-chevron-right"
                  } text-gray-500 text-sm`}
              />
            </div>

            <ul
              className={`
                overflow-hidden transition-all duration-300 ease-in-out
                ${openMenu === "gps-photo-tracker" ||
                  pathname.startsWith("/gps-photo-tracker")
                  ? "max-h-screen opacity-100"
                  : "max-h-0 opacity-0"
                }
              `}
            >
              <li>
                <ActiveLink
                  href="/my-attendance/gps-photo-tracker"
                  className="flex items-center py-[.5rem] pl-[3rem] pr-[1rem] hover:bg-gray-100"
                  activeClassName="bg-gray-200"
                  exact={false}
                >
                  <i className="mr-[.5rem] pi pi-marker text-blue-700"></i>
                  <span className="text-[.830rem]">GPS Photo Tracker</span>
                </ActiveLink>
              </li>
            </ul>
          </li>

          {/* Manage Payroll */}
          <li>
            <div
              className="text-[.850rem] font-bold uppercase text-blue-700 py-[1rem] px-[2rem] flex justify-between gap-2 items-center cursor-pointer"
              onClick={() => toggleMenu("run-payroll")}
            >
              Payroll
              <i
                className={`pi ${openMenu === "run-payroll" || pathname.startsWith("/run-payroll")
                  ? "pi-chevron-down"
                  : "pi-chevron-right"
                  } text-gray-500 text-sm`}
              />
            </div>

            <ul
              className={`
                overflow-hidden transition-all duration-300 ease-in-out
                ${openMenu === "run-payroll" ||
                  pathname.startsWith("/run-payroll")
                  ? "max-h-screen opacity-100"
                  : "max-h-0 opacity-0"
                }
              `}
            >
              <li>
                <ActiveLink
                  href="/run-payroll"
                  className="flex items-center py-[.5rem] pl-[3rem] pr-[1rem] hover:bg-gray-100"
                  activeClassName="bg-gray-200"
                  exact={false}
                >
                  <i className="mr-[.5rem] pi pi-calendar text-blue-700"></i>
                  <span className="text-[.830rem]">Run Payroll</span>
                </ActiveLink>
              </li>
            </ul>
          </li>

          {/* Manage Employees */}
          <li>
            <div
              className="text-[.850rem] font-bold uppercase text-blue-700 py-[1rem] px-[2rem] flex justify-between gap-2 items-center cursor-pointer"
              onClick={() => toggleMenu("employees")}
            >
              Manage Employees
              <i
                className={`pi ${openMenu === "employees" || pathname.startsWith("/employees")
                  ? "pi-chevron-down"
                  : "pi-chevron-right"
                  } text-gray-500 text-sm`}
              />
            </div>

            <ul
              className={`
                overflow-hidden transition-all duration-300 ease-in-out
                ${openMenu === "employees" ||
                  pathname.startsWith("/employees")
                  ? "max-h-screen opacity-100"
                  : "max-h-0 opacity-0"
                }
              `}
            >
              <li>
                <ActiveLink
                  href="/employees"
                  className="flex items-center py-[.5rem] pl-[3rem] pr-[1rem] hover:bg-gray-100"
                  activeClassName="bg-gray-200"
                  exact={false}
                >
                  <i className="mr-[.5rem] pi pi-users text-blue-700"></i>
                  <span className="text-[.830rem]">Employees</span>
                </ActiveLink>
              </li>
              {/* <li>
                <ActiveLink
                  href="/employees/add"
                  className="flex items-center py-[.5rem] pl-[3rem] pr-[1rem] hover:bg-gray-100"
                  activeClassName="bg-gray-200"
                  exact={false}
                >
                  <i className="mr-[.5rem] pi pi-user-plus text-blue-700"></i>
                  <span className="text-[.830rem]">Add Employee</span>
                </ActiveLink>
              </li> */}
            </ul>
          </li>

          {/* Manage Attendance */}
          <li>
            <div
              className="text-[.850rem] font-bold uppercase text-blue-700 py-[1rem] px-[2rem] flex justify-between gap-2 items-center cursor-pointer"
              onClick={() => toggleMenu("attendance-log")}
            >
              Manage Attendance
              <i
                className={`pi ${openMenu === "attendance-log" || pathname.startsWith("/attendance-log")
                  ? "pi-chevron-down"
                  : "pi-chevron-right"
                  } text-gray-500 text-sm`}
              />
            </div>

            <ul
              className={`
                overflow-hidden transition-all duration-300 ease-in-out
                ${openMenu === "attendance-log" ||
                  pathname.startsWith("/attendance-log")
                  ? "max-h-screen opacity-100"
                  : "max-h-0 opacity-0"
                }
              `}
            >
              <li>
                <ActiveLink
                  href="/attendance-log"
                  className="flex items-center py-[.5rem] pl-[3rem] pr-[1rem] hover:bg-gray-100"
                  activeClassName="bg-gray-200"
                  exact={false}
                >
                  <i className="mr-[.5rem] pi pi-clock text-blue-700"></i>
                  <span className="text-[.830rem]">Attendance Log</span>
                </ActiveLink>
              </li>
              <li>
                <ActiveLink
                  href="/attendance-summary"
                  className="flex items-center py-[.5rem] pl-[3rem] pr-[1rem] hover:bg-gray-100"
                  activeClassName="bg-gray-200"
                  exact={false}
                >
                  <i className="mr-[.5rem] pi pi-file-check text-blue-700"></i>
                  <span className="text-[.830rem]">Attendance Summary</span>
                </ActiveLink>
              </li>
              {/* <li>
                <ActiveLink
                  href="/attendance-log/add"
                  className="flex items-center py-[.5rem] pl-[3rem] pr-[1rem] hover:bg-gray-100"
                  activeClassName="bg-gray-200"
                  exact={false}
                >
                  <i className="mr-[.5rem] pi pi-user-plus text-blue-700"></i>
                  <span className="text-[.830rem]">Add Employee</span>
                </ActiveLink>
              </li> */}
            </ul>
          </li>

          {/* Manage Leave */}
          <li>
            <div
              className="text-[.850rem] font-bold uppercase text-blue-700 py-[1rem] px-[2rem] flex justify-between gap-2 items-center cursor-pointer"
              onClick={() => toggleMenu("request-leave")}
            >
              Leave
              <i
                className={`pi ${openMenu === "request-leave" || pathname.startsWith("/request-leave")
                  ? "pi-chevron-down"
                  : "pi-chevron-right"
                  } text-gray-500 text-sm`}
              />
            </div>

            <ul
              className={`
                overflow-hidden transition-all duration-300 ease-in-out
                ${openMenu === "request-leave" ||
                  pathname.startsWith("/request-leave")
                  ? "max-h-screen opacity-100"
                  : "max-h-0 opacity-0"
                }
              `}
            >
              <li>
                <ActiveLink
                  href="/request-leave"
                  className="flex items-center py-[.5rem] pl-[3rem] pr-[1rem] hover:bg-gray-100"
                  activeClassName="bg-gray-200"
                  exact={false}
                >
                  <i className="mr-[.5rem] pi pi-calendar text-blue-700"></i>
                  <span className="text-[.830rem]">Request Leave</span>
                </ActiveLink>
              </li>
            </ul>
          </li>

          {/* General Setting */}
          <li>
            <div
              className="text-[.850rem] font-bold uppercase text-blue-700 py-[1rem] px-[2rem] flex justify-between gap-2 items-center cursor-pointer"
              onClick={() => toggleMenu("setting")}
            >
              General Setting
              <i
                className={`pi ${openMenu === "setting" || pathname.startsWith("/setting")
                  ? "pi-chevron-down"
                  : "pi-chevron-right"
                  } text-gray-500 text-sm`}
              />
            </div>
            <ul
              className={`
                overflow-hidden transition-all duration-300 ease-in-out
                ${openMenu === "setting" || pathname.startsWith("/setting")
                  ? "max-h-screen opacity-100"
                  : "max-h-0 opacity-0"
                }
              `}
            >
              {/* Master Data Submenu */}
              <li>
                <div
                  className="flex justify-between gap-2 items-center cursor-pointer py-[.5rem] pl-[3rem] pr-[1rem] hover:bg-gray-100"
                  onClick={() => toggleSubMenu("master")}
                >
                  <div className="flex items-center">
                    <i className="mr-[.5rem] pi pi-database text-blue-700"></i>
                    <span className="text-[.830rem]">Master Data</span>
                  </div>
                  <i
                    className={`pi ${openSubMenu === "master"
                      ? "pi-chevron-down"
                      : "pi-chevron-right"
                      } text-gray-500 text-xs`}
                  />
                </div>

                <ul
                  className={`
                    overflow-hidden transition-all duration-300 ease-in-out
                    ${openSubMenu === "master"
                      ? "max-h-screen opacity-100"
                      : "max-h-0 opacity-0"
                    }
                  `}
                >
                  {[
                    { href: "/setting/agency", label: "Agency", icon: "pi-building" },
                    { href: "/setting/branch", label: "Branch", icon: "pi-sitemap" },
                    { href: "/setting/bank", label: "Bank", icon: "pi-credit-card" },
                    { href: "/setting/city", label: "City", icon: "pi-map-marker" },
                    { href: "/setting/country", label: "Country", icon: "pi-globe" },
                    { href: "/setting/department", label: "Department", icon: "pi-briefcase" },
                    { href: "/setting/document-type", label: "Document Type", icon: "pi-file" },
                    { href: "/setting/employee-shift-rule", label: "Employee Shift Rule", icon: "pi-calendar" },
                    { href: "/setting/employee-shift-assignment", label: "Employee Shift Assignment", icon: "pi-calendar-plus" },
                    { href: "/setting/employment-status", label: "Employment Status", icon: "pi-id-card" },
                    { href: "/setting/fingerprint-scanner", label: "Fingerprint Scanner", icon: "pi-box" },
                    { href: "/setting/identity-type", label: "Identity Type", icon: "pi-id-card" },
                    { href: "/setting/leave-type", label: "Leave Type", icon: "pi-calendar-plus" },
                    { href: "/setting/position", label: "Position", icon: "pi-users" },
                    { href: "/setting/relationship", label: "Relationship", icon: "pi-heart" },
                    { href: "/setting/shift", label: "Shift", icon: "pi-clock" },
                    { href: "/setting/state", label: "State", icon: "pi-map" },
                    { href: "/setting/user", label: "User", icon: "pi-user" },
                  ].map((item) => (
                    <li key={item.href}>
                      <ActiveLink
                        href={item.href}
                        className="flex items-center py-[.5rem] pl-[4rem] pr-[1rem] hover:bg-gray-100"
                        activeClassName="bg-gray-200"
                        exact={false}
                      >
                        <i className={`mr-[.5rem] pi ${item.icon} text-blue-700`}></i>
                        <span className="text-[.820rem]">{item.label}</span>
                      </ActiveLink>
                    </li>
                  ))}
                </ul>
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  );
}
