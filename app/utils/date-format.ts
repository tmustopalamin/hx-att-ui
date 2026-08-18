import dayjs, { type ConfigType } from "dayjs";
import "dayjs/locale/id";

export const DATE_DISPLAY_FORMAT = "DD MMMM YYYY";
export const DATE_TIME_DISPLAY_FORMAT = "DD MMMM YYYY HH:mm";
export const DATE_TIME_SECONDS_DISPLAY_FORMAT = "DD MMMM YYYY HH:mm:ss";
export const WEEKDAY_DATE_DISPLAY_FORMAT = "dddd, DD MMMM YYYY";
export const COMPACT_DATE_DISPLAY_FORMAT = "DD MMM";
export const MONTH_DISPLAY_FORMAT = "MMMM YYYY";

type DisplayDateValue = ConfigType | null | undefined;

const formatValue = (
  value: DisplayDateValue,
  format: string,
  fallback: string,
) => {
  if (!value) {
    return fallback;
  }

  const parsed = dayjs(value);

  return parsed.isValid() ? parsed.locale("id").format(format) : fallback;
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

export const formatCompactDate = (value: DisplayDateValue, fallback = "-") => {
  const parsed = dayjs(value);

  if (!value || !parsed.isValid()) {
    return fallback;
  }

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

  return `${parsed.locale("id").format("DD")} ${monthNames[parsed.month()]}`;
};

export const formatMonth = (value: DisplayDateValue, fallback = "-") =>
  formatValue(value, MONTH_DISPLAY_FORMAT, fallback);

export const formatRelativeNotificationTime = (
  value: DisplayDateValue,
  now: DisplayDateValue = new Date(),
) => {
  const date = dayjs(value);
  const current = dayjs(now);

  if (!value || !date.isValid() || !current.isValid()) {
    return "-";
  }

  const diffMinutes = Math.floor(current.diff(date, "minute"));

  if (diffMinutes < 1) {
    return "Baru saja";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} menit lalu`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} jam lalu`;
  }

  const diffDays = Math.floor(diffHours / 24);

  if (diffDays < 7) {
    return `${diffDays} hari lalu`;
  }

  return formatValue(value, DATE_DISPLAY_FORMAT, "-");
};
