"use client";

import { useI18n } from "@/app/i18n";
import { routeTranslationKeys } from "@/app/i18n/routes";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const COMPANY_NAME = "PT. Hexing Technology";

const formatSegment = (segment: string) =>
  segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

/** Keeps the browser tab title in sync with the selected UI language. */
export default function DocumentTitleSync() {
  const pathname = usePathname();
  const { t, tText } = useI18n();

  useEffect(() => {
    const segments = pathname
      .split("/")
      .filter(Boolean)
      .filter((segment) => Number.isNaN(Number(segment)));

    if (pathname.startsWith("/login")) {
      document.title = `${t("auth.login.title")} - ${COMPANY_NAME}`;
      return;
    }

    if (pathname.startsWith("/forgot-password")) {
      document.title = `${t("auth.reset.title")} - ${COMPANY_NAME}`;
      return;
    }

    const segment = [...segments]
      .reverse()
      .find((item) => routeTranslationKeys[item]);
    const title = segment
      ? t(routeTranslationKeys[segment])
      : segments.length > 0
        ? tText(formatSegment(segments[segments.length - 1]))
        : t("nav.dashboard");

    document.title = `${title} - ${COMPANY_NAME}`;
  }, [pathname, t, tText]);

  return null;
}
