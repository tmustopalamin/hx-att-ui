import { formatDate } from "@/app/utils/date-format";

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export const formatPayrollCurrency = (
  value: number | string | null | undefined,
) => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") {
    if (value.includes("•") || value === "••••••••") {
      return "Rp ••••••••";
    }
    const num = Number(value);
    if (isNaN(num)) return value;
    return currencyFormatter.format(num);
  }
  return currencyFormatter.format(value);
};

export const formatPayrollDate = (value: string | Date | null) =>
  formatDate(value, "Open ended");

export const formatPayrollPercentage = (
  value: number | string | null | undefined,
) => {
  if (value === null || value === undefined) return "Not configured";
  if (typeof value === "string") {
    if (value.includes("•") || value === "••••••••") {
      return "••••••••";
    }
    const num = Number(value);
    if (isNaN(num)) return value;
    return `${num.toLocaleString("id-ID", {
      maximumFractionDigits: 2,
    })}%`;
  }
  return `${value.toLocaleString("id-ID", {
    maximumFractionDigits: 2,
  })}%`;
};
