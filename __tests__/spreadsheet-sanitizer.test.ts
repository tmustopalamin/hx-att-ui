import {
  sanitizeCellValue,
  sanitizeRowData,
  sanitizeSheetData,
} from "@/app/utils/spreadsheet-sanitizer";

describe("Spreadsheet Formula Injection Sanitizer (OWASP A03 / CWE-1236)", () => {
  it("prefixes dangerous formula characters with a single quote", () => {
    expect(sanitizeCellValue("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
    expect(sanitizeCellValue("+12345")).toBe("'+12345");
    expect(sanitizeCellValue("-cmd|' /C calc'!A0")).toBe("'-cmd|' /C calc'!A0");
    expect(sanitizeCellValue("@something")).toBe("'@something");
    expect(sanitizeCellValue("\tmalicious")).toBe("'\tmalicious");
  });

  it("leaves normal strings, numbers, and booleans untouched", () => {
    expect(sanitizeCellValue("Normal Employee Name")).toBe(
      "Normal Employee Name",
    );
    expect(sanitizeCellValue("EMP_001")).toBe("EMP_001");
    expect(sanitizeCellValue(12345)).toBe(12345);
    expect(sanitizeCellValue(true)).toBe(true);
    expect(sanitizeCellValue(null)).toBeNull();
    expect(sanitizeCellValue(undefined)).toBeUndefined();
  });

  it("sanitizes an entire row record", () => {
    const row = {
      name: "=MALICIOUS()",
      code: "EMP-001",
      age: 30,
    };

    expect(sanitizeRowData(row)).toEqual({
      name: "'=MALICIOUS()",
      code: "EMP-001",
      age: 30,
    });
  });

  it("sanitizes an array of rows for worksheet conversion", () => {
    const rows = [
      { id: 1, title: "+Export" },
      { id: 2, title: "Normal" },
    ];

    expect(sanitizeSheetData(rows)).toEqual([
      { id: 1, title: "'+Export" },
      { id: 2, title: "Normal" },
    ]);
  });
});
