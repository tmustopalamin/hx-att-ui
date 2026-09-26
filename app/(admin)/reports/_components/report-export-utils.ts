import * as XLSX from "@e965/xlsx";
import { saveAs } from "file-saver";
import dayjs from "dayjs";
import { sanitizeSheetData } from "@/app/utils/spreadsheet-sanitizer";

export interface ReportExportSheet<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  sheetName: string;
  data: T[];
}

export function autoFitColumns<T extends Record<string, unknown>>(
  worksheet: XLSX.WorkSheet,
  rows: T[],
) {
  if (!rows || rows.length === 0) return;

  const keys = Object.keys(rows[0]);
  const colWidths = keys.map((key) => {
    let maxLen = key.length;
    for (const row of rows) {
      const val = row[key];
      const strVal = val === null || val === undefined ? "" : String(val);
      if (strVal.length > maxLen) {
        maxLen = strVal.length;
      }
    }
    return { wch: Math.min(Math.max(maxLen + 3, 10), 60) };
  });

  worksheet["!cols"] = colWidths;
}

export function exportReportToExcel({
  filename,
  sheets,
}: {
  filename: string;
  sheets: ReportExportSheet[];
}) {
  const workbook = XLSX.utils.book_new();

  for (const { sheetName, data } of sheets) {
    const sanitizedRows = sanitizeSheetData(data);
    const worksheet = XLSX.utils.json_to_sheet(sanitizedRows);
    autoFitColumns(worksheet, sanitizedRows);

    if (worksheet["!ref"]) {
      worksheet["!autofilter"] = { ref: worksheet["!ref"] };
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  }

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  const fileData = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const safeFilename = filename.endsWith(".xlsx")
    ? filename
    : `${filename}.xlsx`;
  saveAs(fileData, safeFilename);
}

export function exportReportToCsv<T extends Record<string, unknown>>({
  filename,
  rows,
}: {
  filename: string;
  rows: T[];
}) {
  if (!rows || rows.length === 0) {
    const emptyBlob = new Blob([""], { type: "text/csv;charset=utf-8;" });
    saveAs(emptyBlob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
    return;
  }

  const sanitizedRows = sanitizeSheetData(rows);
  const worksheet = XLSX.utils.json_to_sheet(sanitizedRows);
  const csvContent = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const safeFilename = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  saveAs(blob, safeFilename);
}

export function formatReportTimestamp() {
  return dayjs().format("YYYYMMDD_HHmmss");
}
