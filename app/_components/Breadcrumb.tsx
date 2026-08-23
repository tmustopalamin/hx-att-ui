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
    <nav className="flex column items-center gap-5 text-sm text-gray-600">
      <Button
        icon="pi pi-bars"
        rounded
        text
        aria-label={t("common.navigation.toggleSidebar")}
        tooltip={t("common.navigation.toggleSidebar")}
        onClick={() => onClickSidebar(!sidebarVisible)}
      />
      <ol className="flex gap-2">
        <li>
          <Link href="/" className="hover:underline">
            {t("common.navigation.home")}
          </Link>
        </li>
        {segments.map((seg, idx) => {
          const href = "/" + segments.slice(0, idx + 1).join("/");

          return (
            <li key={href} className="flex gap-2">
              <span>/</span>
              <Link href={href} className="hover:underline">
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
