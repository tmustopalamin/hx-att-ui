/**
 * Sanitizes cell values to prevent CSV / Excel Formula Injection (CWE-1236 / OWASP A03).
 * If a string begins with dangerous characters (=, +, -, @, \t, \r), it is escaped
 * with a single quote prefix (') so spreadsheet software treats it strictly as text.
 */
export function sanitizeCellValue(val: unknown): unknown {
  if (typeof val !== "string") return val;
  if (/^[=+\-@]/.test(val.trim()) || /^[\t\r]/.test(val)) {
    return `'${val}`;
  }
  return val;
}

/**
 * Sanitizes all string values within an object record before converting to a worksheet.
 */
export function sanitizeRowData<T extends Record<string, unknown>>(row: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    result[key] = sanitizeCellValue(value);
  }
  return result as T;
}

/**
 * Sanitizes an array of row objects for XLSX.utils.json_to_sheet.
 */
export function sanitizeSheetData<T extends Record<string, unknown>>(
  rows: T[],
): T[] {
  return rows.map(sanitizeRowData);
}
