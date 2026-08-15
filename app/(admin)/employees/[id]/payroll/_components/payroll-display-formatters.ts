import dayjs from "dayjs";

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export const formatPayrollCurrency = (value: number) =>
  currencyFormatter.format(value);

export const formatPayrollDate = (value: string | Date | null) =>
  value ? dayjs(value).format("DD MMM YYYY") : "Open ended";

export const formatPayrollPercentage = (value: number | null) =>
  value === null
    ? "Not configured"
    : `${value.toLocaleString("id-ID", {
        maximumFractionDigits: 2,
      })}%`;
