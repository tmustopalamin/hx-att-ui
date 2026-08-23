"use client";

import { useState } from "react";
import {
  localeLabel,
  localeShortLabel,
  SUPPORTED_LOCALES,
  type Locale,
  useI18n,
} from "@/app/i18n";

export default function LanguageSwitcher({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { locale, setLocale, t } = useI18n();
  const [changing, setChanging] = useState(false);

  const handleChange = async (value: string) => {
    if (!SUPPORTED_LOCALES.includes(value as Locale) || value === locale)
      return;
    setChanging(true);
    try {
      await setLocale(value as Locale);
    } finally {
      setChanging(false);
    }
  };

  return (
    <label
      className={`inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-700 shadow-sm ${changing ? "opacity-70" : ""}`}
    >
      <i className="pi pi-globe text-slate-500" aria-hidden="true" />
      <span className={compact ? "sr-only" : "hidden sm:inline"}>
        {t("common.language")}
      </span>
      <select
        aria-label={t("common.language")}
        value={locale}
        disabled={changing}
        onChange={(event) => void handleChange(event.target.value)}
        className="max-w-[7.5rem] cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold text-slate-700 outline-none"
      >
        {SUPPORTED_LOCALES.map((option) => (
          <option key={option} value={option}>
            {compact ? localeShortLabel(option) : localeLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}
