"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import dayjs, { type ConfigType } from "dayjs";
import "dayjs/locale/id";
import "dayjs/locale/zh-cn";

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  loadMessages,
  normalizeLocale,
  type Locale,
  type MessageValues,
} from "./config";
import englishMessages from "./messages/en";
import staticTextSources from "./staticTextSources";
import { translateStaticText } from "./staticTranslations";

type TranslationParams = Record<string, string | number | null | undefined>;
type DateValue = ConfigType;

type I18nContextValue = {
  locale: Locale;
  setLocale: (nextLocale: Locale) => Promise<void>;
  t: (key: string, params?: TranslationParams) => string;
  /** Translate user-facing static copy without requiring a catalog key. */
  tText: (source: string, params?: TranslationParams) => string;
  formatDate: (value: DateValue, fallback?: string) => string;
  formatDateTime: (value: DateValue, fallback?: string) => string;
  formatRelativeTime: (value: DateValue, now?: DateValue) => string;
  formatNumber: (
    value: number | null | undefined,
    options?: Intl.NumberFormatOptions,
  ) => string;
  formatPercent: (value: number | null | undefined) => string;
  formatCurrency: (
    value: number | null | undefined,
    currency?: string,
  ) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const interpolate = (template: string, params?: TranslationParams) => {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    String(params[name] ?? `{${name}}`),
  );
};

const parseDate = (value: DateValue) => {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
};

const formatDayjs = (
  value: DateValue,
  locale: Locale,
  pattern: string,
  fallback: string,
) => {
  const parsed = parseDate(value);
  if (!parsed) return fallback;
  const dayjsLocale =
    locale === "id" ? "id" : locale === "zh-CN" ? "zh-cn" : "en";
  return parsed.locale(dayjsLocale).format(pattern);
};

const writeLocaleCookie = (locale: Locale) => {
  document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}; Path=/; Max-Age=31536000; SameSite=Lax`;
};

const resolveMessage = (
  messages: MessageValues,
  locale: Locale,
  key: string,
) => {
  const message =
    messages[key] ??
    staticTextSources[key as keyof typeof staticTextSources] ??
    key;
  const isStaticKey =
    key.startsWith("static.") ||
    Object.prototype.hasOwnProperty.call(staticTextSources, key);
  if (locale === "en" && !isStaticKey) return message;
  return translateStaticText(message, locale);
};

const fallbackTranslate = (key: string, params?: TranslationParams) =>
  interpolate(resolveMessage(englishMessages, DEFAULT_LOCALE, key), params);

const fallbackI18nContext: I18nContextValue = {
  locale: DEFAULT_LOCALE,
  setLocale: async () => undefined,
  t: fallbackTranslate,
  tText: (source, params) => interpolate(source, params),
  formatDate: (value, fallback = "-") =>
    formatDayjs(value, DEFAULT_LOCALE, "DD MMMM YYYY", fallback),
  formatDateTime: (value, fallback = "-") =>
    formatDayjs(value, DEFAULT_LOCALE, "DD MMMM YYYY HH:mm", fallback),
  formatRelativeTime: (value, now = new Date()) => {
    const date = parseDate(value);
    const current = parseDate(now);
    if (!date || !current) return "-";
    const diffMinutes = Math.floor(current.diff(date, "minute"));
    if (diffMinutes < 1) return fallbackTranslate("date.justNow");
    if (diffMinutes < 60)
      return fallbackTranslate("date.minutesAgo", { count: diffMinutes });
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24)
      return fallbackTranslate("date.hoursAgo", { count: diffHours });
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7)
      return fallbackTranslate("date.daysAgo", { count: diffDays });
    return formatDayjs(value, DEFAULT_LOCALE, "DD MMMM YYYY", "-");
  },
  formatNumber: (value, options) =>
    value == null || !Number.isFinite(value)
      ? "-"
      : new Intl.NumberFormat(DEFAULT_LOCALE, options).format(value),
  formatPercent: (value) =>
    value == null || !Number.isFinite(value)
      ? "-"
      : new Intl.NumberFormat(DEFAULT_LOCALE, {
          style: "percent",
          maximumFractionDigits: 2,
        }).format(value),
  formatCurrency: (value, currency = "IDR") =>
    value == null || !Number.isFinite(value)
      ? "-"
      : new Intl.NumberFormat(DEFAULT_LOCALE, {
          style: "currency",
          currency,
          maximumFractionDigits: 0,
        }).format(value),
};

export function I18nProvider({
  initialLocale,
  initialMessages,
  children,
}: {
  initialLocale: Locale;
  initialMessages: MessageValues;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState(initialLocale);
  const [messages, setMessages] = useState(initialMessages);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.dispatchEvent(
      new CustomEvent("hris-locale-change", { detail: locale }),
    );
  }, [locale]);

  const setLocale = useCallback(
    async (nextLocale: Locale) => {
      const safeLocale = normalizeLocale(nextLocale);
      if (safeLocale === locale) return;
      const nextMessages = await loadMessages(safeLocale);
      setMessages(nextMessages);
      setLocaleState(safeLocale);
      writeLocaleCookie(safeLocale);
    },
    [locale],
  );

  const t = useCallback(
    (key: string, params?: TranslationParams) =>
      interpolate(resolveMessage(messages, locale, key), params),
    [locale, messages],
  );

  const tText = useCallback(
    (source: string, params?: TranslationParams) =>
      interpolate(translateStaticText(source, locale), params),
    [locale],
  );

  const formatDate = useCallback(
    (value: DateValue, fallback = "-") =>
      formatDayjs(value, locale, "DD MMMM YYYY", fallback),
    [locale],
  );

  const formatDateTime = useCallback(
    (value: DateValue, fallback = "-") =>
      formatDayjs(value, locale, "DD MMMM YYYY HH:mm", fallback),
    [locale],
  );

  const formatRelativeTime = useCallback(
    (value: DateValue, now: DateValue = new Date()) => {
      const date = parseDate(value);
      const current = parseDate(now);
      if (!date || !current) return "-";
      const diffMinutes = Math.floor(current.diff(date, "minute"));
      if (diffMinutes < 1) return t("date.justNow");
      if (diffMinutes < 60) return t("date.minutesAgo", { count: diffMinutes });
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return t("date.hoursAgo", { count: diffHours });
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return t("date.daysAgo", { count: diffDays });
      return formatDate(value);
    },
    [formatDate, t],
  );

  const formatNumber = useCallback(
    (value: number | null | undefined, options?: Intl.NumberFormatOptions) =>
      value == null || !Number.isFinite(value)
        ? "-"
        : new Intl.NumberFormat(locale, options).format(value),
    [locale],
  );

  const formatPercent = useCallback(
    (value: number | null | undefined) =>
      formatNumber(value, { style: "percent", maximumFractionDigits: 2 }),
    [formatNumber],
  );

  const formatCurrency = useCallback(
    (value: number | null | undefined, currency = "IDR") =>
      formatNumber(value, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }),
    [formatNumber],
  );

  const contextValue = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t,
      tText,
      formatDate,
      formatDateTime,
      formatRelativeTime,
      formatNumber,
      formatPercent,
      formatCurrency,
    }),
    [
      formatCurrency,
      formatDate,
      formatDateTime,
      formatNumber,
      formatPercent,
      formatRelativeTime,
      locale,
      setLocale,
      t,
      tText,
    ],
  );

  return (
    <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>
  );
}

export const useI18n = (): I18nContextValue => {
  const context = useContext(I18nContext);
  return context ?? fallbackI18nContext;
};

export const getClientLocale = (): Locale => {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LOCALE_COOKIE_NAME}=`));
  return normalizeLocale(cookie?.slice(LOCALE_COOKIE_NAME.length + 1));
};
