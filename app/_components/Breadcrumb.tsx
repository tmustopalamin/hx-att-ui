"use client";
import { useI18n } from "@/app/i18n";
import { routeTranslationKeys } from "@/app/i18n/routes";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "primereact/button";
import React from "react";

type ChildProps = {
  sidebarVisible: boolean;
  onClickSidebar: (visible: boolean) => void;
};

const Breadcrumb = ({
  sidebarVisible,
  onClickSidebar: onClickSidebar,
}: ChildProps) => {
  const pathname = usePathname();
  const { t, tText } = useI18n();
  const segments = pathname
    .split("/")
    .filter(Boolean)
    // skip segment dinamis (contoh angka)
    .filter((seg) => isNaN(Number(seg)));

  const format = (str: string) =>
    str
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");

  const translateSegment = (segment: string) => {
    const translationKey = routeTranslationKeys[segment];
    return translationKey ? t(translationKey) : tText(format(segment));
  };

  return (
    <nav className="flex items-center gap-2 sm:gap-3 text-sm text-gray-600 min-w-0">
      <Button
        icon="pi pi-bars"
        rounded
        text
        className="shrink-0"
        aria-label={t("common.navigation.toggleSidebar")}
        tooltip={t("common.navigation.toggleSidebar")}
        onClick={() => onClickSidebar(!sidebarVisible)}
      />

      {/* Mobile view: show current active page title cleanly without overflow */}
      {segments.length > 0 ? (
        <span className="truncate text-sm font-semibold text-slate-800 sm:hidden">
          {translateSegment(segments[segments.length - 1])}
        </span>
      ) : (
        <span className="truncate text-sm font-semibold text-slate-800 sm:hidden">
          {t("common.navigation.home")}
        </span>
      )}

      {/* Tablet and Desktop: show full breadcrumb trail */}
      <ol className="hidden sm:flex items-center gap-2 min-w-0 overflow-hidden text-sm">
        <li className="shrink-0">
          <Link href="/" className="hover:underline">
            {t("common.navigation.home")}
          </Link>
        </li>
        {segments.map((seg, idx) => {
          const href = "/" + segments.slice(0, idx + 1).join("/");
          const isLast = idx === segments.length - 1;

          return (
            <li key={href} className="flex items-center gap-2 min-w-0">
              <span className="text-slate-400">/</span>
              <Link
                href={href}
                className={`truncate hover:underline ${
                  isLast ? "font-semibold text-slate-800" : "text-slate-600"
                }`}
              >
                {translateSegment(seg)}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
