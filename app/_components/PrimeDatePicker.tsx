"use client";
import { useI18n } from "@/app/i18n";

import dayjs from "dayjs";
import { Calendar, type CalendarProps } from "primereact/calendar";

type PrimeDatePickerProps = Omit<
  CalendarProps<"single", Date>,
  "value" | "onChange"
> & {
  value?: string | null;
  onValueChange: (value: string) => void;
  withTime?: boolean;
};

const getBody = () => document.body;

/**
 * String-backed PrimeReact calendar for API fields stored as ISO dates.
 * It keeps the existing YYYY-MM-DD / YYYY-MM-DDTHH:mm contracts while
 * providing one consistent picker across the application.
 */
export default function PrimeDatePicker({
  value,
  onValueChange,
  withTime = false,
  appendTo = getBody,
  dateFormat,
  locale,
  showIcon = true,
  ...props
}: PrimeDatePickerProps) {
  const { locale: activeLocale } = useI18n();
  const resolvedLocale = locale ?? activeLocale;
  const resolvedDateFormat =
    dateFormat ??
    (resolvedLocale === "en"
      ? "mm/dd/yy"
      : resolvedLocale === "zh-CN"
        ? "yy/mm/dd"
        : "dd MM yy");

  return (
    <Calendar
      {...props}
      appendTo={appendTo}
      dateFormat={resolvedDateFormat}
      locale={resolvedLocale}
      showIcon={showIcon}
      showTime={withTime}
      hourFormat={withTime ? "24" : undefined}
      value={value ? dayjs(value).toDate() : null}
      onChange={(event) => {
        const nextValue = event.value;
        onValueChange(
          nextValue
            ? dayjs(nextValue).format(
                withTime ? "YYYY-MM-DDTHH:mm" : "YYYY-MM-DD",
              )
            : "",
        );
      }}
    />
  );
}
