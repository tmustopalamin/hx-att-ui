import dayjs, { type ConfigType } from "dayjs";
import "dayjs/locale/id";
import "dayjs/locale/zh-cn";

import {
  LOCALE_COOKIE_NAME,
  normalizeLocale,
  type Locale,
} from "@/app/i18n/config";

export const DATE_DISPLAY_FORMAT = "DD MMMM YYYY";
export const DATE_TIME_DISPLAY_FORMAT = "DD MMMM YYYY HH:mm";
export const DATE_TIME_SECONDS_DISPLAY_FORMAT = "DD MMMM YYYY HH:mm:ss";
export const WEEKDAY_DATE_DISPLAY_FORMAT = "dddd, DD MMMM YYYY";
export const COMPACT_DATE_DISPLAY_FORMAT = "DD MMM";
export const MONTH_DISPLAY_FORMAT = "MMMM YYYY";

type DisplayDateValue = ConfigType | null | undefined;

const getLocaleFromDocument = (): Locale => {
  if (typeof document === "undefined") return "en";
  const value = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LOCALE_COOKIE_NAME}=`))
    ?.slice(LOCALE_COOKIE_NAME.length + 1);
  return normalizeLocale(value);
};

const dayjsLocale = (locale: Locale) =>
  locale === "id" ? "id" : locale === "zh-CN" ? "zh-cn" : "en";

const formatValue = (
  value: DisplayDateValue,
  format: string,
  fallback: string,
) => {
  if (!value) return fallback;
  const parsed = dayjs(value);
  return parsed.isValid()
    ? parsed.locale(dayjsLocale(getLocaleFromDocument())).format(format)
    : fallback;
};

export const formatDate = (value: DisplayDateValue, fallback = "-") =>
  formatValue(value, DATE_DISPLAY_FORMAT, fallback);
export const formatDateTime = (value: DisplayDateValue, fallback = "-") =>
  formatValue(value, DATE_TIME_DISPLAY_FORMAT, fallback);
export const formatDateTimeWithSeconds = (
  value: DisplayDateValue,
  fallback = "-",
) => formatValue(value, DATE_TIME_SECONDS_DISPLAY_FORMAT, fallback);
export const formatWeekdayDate = (value: DisplayDateValue, fallback = "-") =>
  formatValue(value, WEEKDAY_DATE_DISPLAY_FORMAT, fallback);
export const formatWeekday = (value: DisplayDateValue, fallback = "-") =>
  formatValue(value, "dddd", fallback);
export const formatCompactDate = (value: DisplayDateValue, fallback = "-") =>
  (() => {
    const locale = getLocaleFromDocument();
    if (locale !== "id")
      return formatValue(value, COMPACT_DATE_DISPLAY_FORMAT, fallback);
    if (!value) return fallback;
    const parsed = dayjs(value);
    if (!parsed.isValid()) return fallback;
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];
    return `${parsed.format("DD")} ${monthNames[parsed.month()]}`;
  })();
export const formatMonth = (value: DisplayDateValue, fallback = "-") =>
  formatValue(value, MONTH_DISPLAY_FORMAT, fallback);

export const formatRelativeNotificationTime = (
  value: DisplayDateValue,
  now: DisplayDateValue = new Date(),
) => {
  const date = dayjs(value);
  const current = dayjs(now);
  if (!value || !date.isValid() || !current.isValid()) return "-";

  const locale = getLocaleFromDocument();
  const diffMinutes = Math.floor(current.diff(date, "minute"));
  if (diffMinutes < 1)
    return locale === "id"
      ? "Baru saja"
      : locale === "zh-CN"
        ? "刚刚"
        : "Just now";
  if (diffMinutes < 60) {
    return locale === "id"
      ? `${diffMinutes} menit lalu`
      : locale === "zh-CN"
        ? `${diffMinutes} 分钟前`
        : `${diffMinutes} minutes ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return locale === "id"
      ? `${diffHours} jam lalu`
      : locale === "zh-CN"
        ? `${diffHours} 小时前`
        : `${diffHours} hours ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return locale === "id"
      ? `${diffDays} hari lalu`
      : locale === "zh-CN"
        ? `${diffDays} 天前`
        : `${diffDays} days ago`;
  }

  return formatDate(value, "-");
};
