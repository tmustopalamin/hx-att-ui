import * as XLSX from "@e965/xlsx";
import { saveAs } from "file-saver";
import dayjs from "dayjs";
import {
  CompensationBulkImportRow,
  CompensationComponentType,
} from "../types/employee-compensation-bulk";

export interface MasterCompensationReferenceData {
  employees?: Array<{
    id: number;
    code?: string | null;
    name: string;
    department?: string | null;
    position?: string | null;
  }>;
  incomeComponents?: Array<{
    id: number;
    code?: string | null;
    name: string;
    calculation_method_code?: string | null;
    is_active: boolean;
  }>;
  deductionComponents?: Array<{
    id: number;
    code?: string | null;
    name: string;
    is_active: boolean;
  }>;
  frequencies?: Array<{
    id: number;
    code: string;
    name: string;
  }>;
}

export const COMPENSATION_TEMPLATE_COLUMNS: Array<{
  header: string;
  field: keyof CompensationBulkImportRow;
  required?: boolean;
  width?: number;
}> = [
  { header: "Employee Code*", field: "code", required: true, width: 22 },
  { header: "Nama Karyawan (Opsional)", field: "employee_name", width: 26 },
  {
    header: "Tipe Komponen* (TUNJANGAN / POTONGAN)",
    field: "component_type",
    required: true,
    width: 32,
  },
  {
    header: "Nama / Kode Komponen*",
    field: "component_name",
    required: true,
    width: 28,
  },
  {
    header: "Nominal / Jumlah (Rp)*",
    field: "amount",
    required: true,
    width: 22,
  },
  {
    header: "Frekuensi (Bulanan/Harian/Mingguan)",
    field: "frequency",
    width: 28,
  },
  {
    header: "Tanggal Mulai Berlaku* (YYYY-MM-DD)",
    field: "start_date",
    required: true,
    width: 28,
  },
  {
    header: "Tanggal Berakhir (YYYY-MM-DD)",
    field: "end_date",
    width: 26,
  },
  { header: "Persentase (%)", field: "percentage", width: 16 },
  { header: "Komponen Acuan", field: "based_on_component", width: 22 },
  { header: "Keterangan / Catatan", field: "notes", width: 32 },
];

export const SAMPLE_COMPENSATION_ROWS: Record<string, string | number>[] = [
  {
    "Employee Code*": "EMP001",
    "Nama Karyawan (Opsional)": "Budi Santoso Prasetyo",
    "Tipe Komponen* (TUNJANGAN / POTONGAN)": "TUNJANGAN",
    "Nama / Kode Komponen*": "Tunjangan Transport",
    "Nominal / Jumlah (Rp)*": 500000,
    "Frekuensi (Bulanan/Harian/Mingguan)": "Bulanan",
    "Tanggal Mulai Berlaku* (YYYY-MM-DD)": "2024-01-01",
    "Tanggal Berakhir (YYYY-MM-DD)": "",
    "Persentase (%)": "",
    "Komponen Acuan": "",
    "Keterangan / Catatan": "Tunjangan transport operasional",
  },
  {
    "Employee Code*": "EMP001",
    "Nama Karyawan (Opsional)": "Budi Santoso Prasetyo",
    "Tipe Komponen* (TUNJANGAN / POTONGAN)": "TUNJANGAN",
    "Nama / Kode Komponen*": "Insentif Kehadiran",
    "Nominal / Jumlah (Rp)*": 300000,
    "Frekuensi (Bulanan/Harian/Mingguan)": "Bulanan",
    "Tanggal Mulai Berlaku* (YYYY-MM-DD)": "2024-01-01",
    "Tanggal Berakhir (YYYY-MM-DD)": "",
    "Persentase (%)": "",
    "Komponen Acuan": "",
    "Keterangan / Catatan": "Insentif kehadiran bulanan",
  },
  {
    "Employee Code*": "EMP001",
    "Nama Karyawan (Opsional)": "Budi Santoso Prasetyo",
    "Tipe Komponen* (TUNJANGAN / POTONGAN)": "POTONGAN",
    "Nama / Kode Komponen*": "Potongan Koperasi",
    "Nominal / Jumlah (Rp)*": 100000,
    "Frekuensi (Bulanan/Harian/Mingguan)": "Bulanan",
    "Tanggal Mulai Berlaku* (YYYY-MM-DD)": "2024-01-01",
    "Tanggal Berakhir (YYYY-MM-DD)": "",
    "Persentase (%)": "",
    "Komponen Acuan": "",
    "Keterangan / Catatan": "Iuran wajib anggota koperasi",
  },
  {
    "Employee Code*": "EMP002",
    "Nama Karyawan (Opsional)": "Siti Nurhaliza",
    "Tipe Komponen* (TUNJANGAN / POTONGAN)": "TUNJANGAN",
    "Nama / Kode Komponen*": "Tunjangan Makan",
    "Nominal / Jumlah (Rp)*": 25000,
    "Frekuensi (Bulanan/Harian/Mingguan)": "Harian",
    "Tanggal Mulai Berlaku* (YYYY-MM-DD)": "2024-01-01",
    "Tanggal Berakhir (YYYY-MM-DD)": "",
    "Persentase (%)": "",
    "Komponen Acuan": "",
    "Keterangan / Catatan": "Uang makan kehadiran harian",
  },
];

export function generateCompensationTemplate(
  references: MasterCompensationReferenceData,
  includeSample: boolean = true,
) {
  const wb = XLSX.utils.book_new();

  // 1. Main Sheet
  const rows = includeSample ? SAMPLE_COMPENSATION_ROWS : [];
  const wsMain = XLSX.utils.json_to_sheet(rows, {
    header: COMPENSATION_TEMPLATE_COLUMNS.map((c) => c.header),
  });
  wsMain["!cols"] = COMPENSATION_TEMPLATE_COLUMNS.map((c) => ({
    wch: c.width || 20,
  }));
  XLSX.utils.book_append_sheet(wb, wsMain, "Komponen Gaji Karyawan");

  // 2. Guide Sheet
  const guideRows = [
    {
      "Nama Kolom": "NIK / Employee Code*",
      Wajib: "YA",
      "Keterangan & Format":
        "Nomor Induk Karyawan yang terdaftar di sistem HRIS. Contoh: EMP001 atau 10232.",
    },
    {
      "Nama Kolom": "Nama Karyawan (Opsional)",
      Wajib: "TIDAK",
      "Keterangan & Format":
        "Nama karyawan untuk memudahkan pengecekan visual. Backend mencocokkan data berdasarkan NIK.",
    },
    {
      "Nama Kolom": "Tipe Komponen*",
      Wajib: "YA",
      "Keterangan & Format":
        "Pilih 'TUNJANGAN' (untuk tunjangan/insentif) atau 'POTONGAN' (untuk potongan gaji rutin).",
    },
    {
      "Nama Kolom": "Nama / Kode Komponen*",
      Wajib: "YA",
      "Keterangan & Format":
        "Nama atau kode komponen sesuai master data (lihat sheet 'Referensi Tunjangan' & 'Referensi Potongan').",
    },
    {
      "Nama Kolom": "Nominal / Jumlah (Rp)*",
      Wajib: "YA",
      "Keterangan & Format":
        "Nominal angka rupiah tanpa simbol atau titik ribuan. Contoh: 500000.",
    },
    {
      "Nama Kolom": "Frekuensi",
      Wajib: "TIDAK",
      "Keterangan & Format":
        "Bulanan (Monthly), Harian (Daily), atau Mingguan (Weekly). Default: Bulanan.",
    },
    {
      "Nama Kolom": "Tanggal Mulai Berlaku*",
      Wajib: "YA",
      "Keterangan & Format":
        "Format: YYYY-MM-DD (Contoh: 2024-01-01). Bila kosong, menggunakan tanggal bergabung karyawan.",
    },
    {
      "Nama Kolom": "Tanggal Berakhir",
      Wajib: "TIDAK",
      "Keterangan & Format":
        "Format: YYYY-MM-DD. Kosongkan bila berlaku terus menerus tanpa batas akhir.",
    },
    {
      "Nama Kolom": "Persentase (%)",
      Wajib: "KONDISIONAL",
      "Keterangan & Format":
        "Wajib diisi jika komponen menggunakan metode perhitungan Persentase (0 - 100).",
    },
    {
      "Nama Kolom": "Komponen Acuan",
      Wajib: "TIDAK",
      "Keterangan & Format":
        "Komponen acuan jika perhitungan berbasis komponen lain (misal: Gaji Pokok).",
    },
    {
      "Nama Kolom": "Keterangan / Catatan",
      Wajib: "TIDAK",
      "Keterangan & Format":
        "Catatan atau alasan penetapan komponen untuk keperluan arsip.",
    },
  ];
  const wsGuide = XLSX.utils.json_to_sheet(guideRows);
  wsGuide["!cols"] = [{ wch: 28 }, { wch: 16 }, { wch: 65 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, "Panduan Pengisian");

  // 3. Employee Reference Sheet
  if (references.employees && references.employees.length > 0) {
    const empRows = references.employees.map((e) => ({
      NIK: e.code || "",
      "Nama Karyawan": e.name,
      Departemen: e.department || "-",
      Jabatan: e.position || "-",
    }));
    const wsEmp = XLSX.utils.json_to_sheet(empRows);
    wsEmp["!cols"] = [{ wch: 18 }, { wch: 28 }, { wch: 24 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, wsEmp, "Referensi Karyawan");
  }

  // 4. Income Component Reference Sheet
  if (references.incomeComponents && references.incomeComponents.length > 0) {
    const incRows = references.incomeComponents
      .filter((c) => c.is_active)
      .map((c) => ({
        Kode: c.code || "",
        "Nama Tunjangan / Insentif": c.name,
        "Metode Perhitungan": c.calculation_method_code || "FIXED",
      }));
    const wsInc = XLSX.utils.json_to_sheet(incRows);
    wsInc["!cols"] = [{ wch: 18 }, { wch: 32 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, wsInc, "Referensi Tunjangan");
  }

  // 5. Deduction Component Reference Sheet
  if (
    references.deductionComponents &&
    references.deductionComponents.length > 0
  ) {
    const dedRows = references.deductionComponents
      .filter((c) => c.is_active)
      .map((c) => ({
        Kode: c.code || "",
        "Nama Potongan": c.name,
      }));
    const wsDed = XLSX.utils.json_to_sheet(dedRows);
    wsDed["!cols"] = [{ wch: 18 }, { wch: 32 }];
    XLSX.utils.book_append_sheet(wb, wsDed, "Referensi Potongan");
  }

  // 6. Frequency Reference Sheet
  const defaultFrequencies = [
    {
      Kode: "MONTHLY",
      "Nama Frekuensi": "Bulanan",
      Keterangan: "Dihitung per periode gaji bulanan",
    },
    {
      Kode: "DAILY",
      "Nama Frekuensi": "Harian",
      Keterangan: "Dihitung per hari kehadiran kerja",
    },
    {
      Kode: "WEEKLY",
      "Nama Frekuensi": "Mingguan",
      Keterangan: "Dihitung per minggu kerja",
    },
  ];
  const wsFreq = XLSX.utils.json_to_sheet(
    references.frequencies && references.frequencies.length > 0
      ? references.frequencies.map((f) => ({
          Kode: f.code,
          "Nama Frekuensi": f.name,
          Keterangan: f.code.toUpperCase() === "MONTHLY" ? "Bulanan" : f.code,
        }))
      : defaultFrequencies,
  );
  wsFreq["!cols"] = [{ wch: 16 }, { wch: 20 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, wsFreq, "Referensi Frekuensi");

  // Save File
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, "template_import_kompensasi_karyawan.xlsx");
}

export function exportCompensationsToExcel(
  items: Array<{
    code: string;
    employee_name?: string;
    component_type: "TUNJANGAN" | "POTONGAN";
    component_name: string;
    amount: number;
    frequency?: string;
    start_date?: string;
    end_date?: string;
    percentage?: number | null;
    based_on_component?: string | null;
    notes?: string | null;
  }>,
) {
  const wb = XLSX.utils.book_new();

  const exportRows = items.map((row) => ({
    "NIK / Employee Code*": row.code,
    "Nama Karyawan (Opsional)": row.employee_name || "",
    "Tipe Komponen* (TUNJANGAN / POTONGAN)": row.component_type,
    "Nama / Kode Komponen*": row.component_name,
    "Nominal / Jumlah (Rp)*": row.amount,
    "Frekuensi (Bulanan/Harian/Mingguan)": row.frequency || "Bulanan",
    "Tanggal Mulai Berlaku* (YYYY-MM-DD)": row.start_date
      ? dayjs(row.start_date).format("YYYY-MM-DD")
      : "",
    "Tanggal Berakhir (YYYY-MM-DD)": row.end_date
      ? dayjs(row.end_date).format("YYYY-MM-DD")
      : "",
    "Persentase (%)": row.percentage ?? "",
    "Komponen Acuan": row.based_on_component || "",
    "Keterangan / Catatan": row.notes || "",
  }));

  const ws = XLSX.utils.json_to_sheet(exportRows, {
    header: COMPENSATION_TEMPLATE_COLUMNS.map((c) => c.header),
  });
  ws["!cols"] = COMPENSATION_TEMPLATE_COLUMNS.map((c) => ({
    wch: c.width || 20,
  }));
  XLSX.utils.book_append_sheet(wb, ws, "Komponen Gaji Karyawan");

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(
    blob,
    `export_kompensasi_karyawan_${dayjs().format("YYYYMMDD_HHmmss")}.xlsx`,
  );
}

export async function parseCompensationSpreadsheet(
  file: File,
  references?: MasterCompensationReferenceData,
): Promise<CompensationBulkImportRow[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, {
    type: "array",
    cellDates: true,
  });

  const sheetNames = workbook.SheetNames;
  const targetSheetName =
    sheetNames.find((s) => s.toLowerCase().includes("komponen")) ||
    sheetNames[0];

  const worksheet = workbook.Sheets[targetSheetName];
  if (!worksheet) {
    throw new Error("Sheet data tidak ditemukan di file Excel.");
  }

  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(
    worksheet,
    { defval: "" },
  );

  if (rawRows.length === 0) {
    throw new Error("File Excel tidak memiliki baris data untuk diimpor.");
  }

  // Pre-index references for instant client validation
  const empMap = new Map<string, string>();
  if (references?.employees) {
    for (const e of references.employees) {
      if (e.code) {
        empMap.set(e.code.trim().toLowerCase(), e.name);
      }
    }
  }

  const incomeMap = new Map<string, string>();
  if (references?.incomeComponents) {
    for (const c of references.incomeComponents) {
      incomeMap.set(c.name.trim().toLowerCase(), c.name);
      if (c.code) {
        incomeMap.set(c.code.trim().toLowerCase(), c.name);
      }
    }
  }

  const deductionMap = new Map<string, string>();
  if (references?.deductionComponents) {
    for (const c of references.deductionComponents) {
      deductionMap.set(c.name.trim().toLowerCase(), c.name);
      if (c.code) {
        deductionMap.set(c.code.trim().toLowerCase(), c.name);
      }
    }
  }

  const findValue = (
    row: Record<string, unknown>,
    aliases: string[],
  ): string => {
    for (const alias of aliases) {
      const direct = row[alias];
      if (direct !== undefined && direct !== null && String(direct).trim()) {
        return String(direct).trim();
      }
    }
    // Case-insensitive fallback
    const keys = Object.keys(row);
    for (const alias of aliases) {
      const matchedKey = keys.find(
        (k) =>
          k.toLowerCase().includes(alias.toLowerCase()) ||
          alias.toLowerCase().includes(k.toLowerCase()),
      );
      if (matchedKey) {
        const val = row[matchedKey];
        if (val !== undefined && val !== null && String(val).trim()) {
          return String(val).trim();
        }
      }
    }
    return "";
  };

  const parsedList: CompensationBulkImportRow[] = [];

  rawRows.forEach((row, index) => {
    const rowNumber = index + 2;

    const code = findValue(row, [
      "Employee Code*",
      "Employee Code",
      "Kode Karyawan",
      "Kode Pegawai",
      "NIK / Employee Code*",
      "NIK",
      "Employee ID",
      "NIK Karyawan",
    ]);

    // Skip entirely empty row
    if (
      !code &&
      Object.values(row).every((v) => !v || String(v).trim() === "")
    ) {
      return;
    }

    const employee_name = findValue(row, [
      "Nama Karyawan (Opsional)",
      "Nama Karyawan",
      "Nama Lengkap",
      "Employee Name",
      "Nama",
    ]);

    const comp_type_raw = findValue(row, [
      "Tipe Komponen* (TUNJANGAN / POTONGAN)",
      "Tipe Komponen",
      "Tipe",
      "Type",
      "Jenis Komponen",
    ]);

    const comp_name = findValue(row, [
      "Nama / Kode Komponen*",
      "Nama Komponen",
      "Kode Komponen",
      "Komponen",
      "Component Name",
    ]);

    const amount_raw = findValue(row, [
      "Nominal / Jumlah (Rp)*",
      "Nominal",
      "Jumlah",
      "Amount",
      "Besaran",
    ]);

    const frequency = findValue(row, [
      "Frekuensi (Bulanan/Harian/Mingguan)",
      "Frekuensi",
      "Frequency",
    ]);

    const start_date_raw = findValue(row, [
      "Tanggal Mulai Berlaku* (YYYY-MM-DD)",
      "Tanggal Mulai Berlaku",
      "Tanggal Mulai",
      "Start Date",
      "Effective From",
    ]);

    const end_date_raw = findValue(row, [
      "Tanggal Berakhir (YYYY-MM-DD)",
      "Tanggal Berakhir",
      "Tanggal Selesai",
      "End Date",
      "Effective To",
    ]);

    const percentage_raw = findValue(row, [
      "Persentase (%)",
      "Persentase",
      "Percentage",
    ]);
    const based_on = findValue(row, ["Komponen Acuan", "Acuan", "Based On"]);
    const notes = findValue(row, [
      "Keterangan / Catatan",
      "Keterangan",
      "Catatan",
      "Notes",
    ]);

    const validationErrors: string[] = [];

    // 1. Employee Code
    if (!code) {
      validationErrors.push("Employee Code wajib diisi.");
    }

    // 2. Component Name
    if (!comp_name) {
      validationErrors.push("Nama / Kode Komponen wajib diisi.");
    }

    // 3. Amount
    let cleanAmountStr = amount_raw.replace(/[^0-9.-]/g, "");
    let amount = parseFloat(cleanAmountStr);
    if (isNaN(amount) || amount < 0) {
      validationErrors.push("Nominal (Rp) harus angka positif valid.");
      amount = 0;
    }

    // 4. Dates
    let formattedStartDate: string | null = null;
    if (start_date_raw) {
      const d = dayjs(start_date_raw);
      if (d.isValid()) {
        formattedStartDate = d.format("YYYY-MM-DD");
      } else {
        validationErrors.push(
          "Format Tanggal Mulai tidak valid (gunakan YYYY-MM-DD).",
        );
      }
    }

    let formattedEndDate: string | null = null;
    if (end_date_raw) {
      const d = dayjs(end_date_raw);
      if (d.isValid()) {
        formattedEndDate = d.format("YYYY-MM-DD");
        if (formattedStartDate && d.isBefore(dayjs(formattedStartDate))) {
          validationErrors.push(
            "Tanggal Berakhir harus sama atau setelah Tanggal Mulai.",
          );
        }
      } else {
        validationErrors.push(
          "Format Tanggal Berakhir tidak valid (gunakan YYYY-MM-DD).",
        );
      }
    }

    // 5. Percentage
    let percentage: number | null = null;
    if (percentage_raw) {
      const p = parseFloat(percentage_raw.replace(/[^0-9.-]/g, ""));
      if (!isNaN(p)) {
        if (p < 0 || p > 100) {
          validationErrors.push("Persentase harus berada di antara 0 dan 100.");
        } else {
          percentage = p;
        }
      }
    }

    // 6. Resolved Type (INCOME / DEDUCTION)
    let resolvedType: CompensationComponentType | undefined = undefined;
    const typeUpper = comp_type_raw.toUpperCase();
    if (
      typeUpper.includes("TUNJANGAN") ||
      typeUpper.includes("INCOME") ||
      typeUpper.includes("INSENTIF") ||
      typeUpper.includes("EARNING")
    ) {
      resolvedType = "INCOME";
    } else if (
      typeUpper.includes("POTONGAN") ||
      typeUpper.includes("DEDUCTION")
    ) {
      resolvedType = "DEDUCTION";
    } else {
      // Auto resolve from reference maps
      const compLower = comp_name.toLowerCase();
      if (incomeMap.has(compLower)) {
        resolvedType = "INCOME";
      } else if (deductionMap.has(compLower)) {
        resolvedType = "DEDUCTION";
      } else if (comp_name) {
        resolvedType = "INCOME"; // fallback assumption
      }
    }

    // Check employee code in references if available
    let resolvedEmployeeName = employee_name;
    const normalizedCode = code.trim().toLowerCase();
    if (empMap.size > 0) {
      const matchedName = empMap.get(normalizedCode);
      if (matchedName) {
        resolvedEmployeeName = matchedName;
      } else if (code) {
        validationErrors.push(
          `NIK '${code}' tidak ditemukan pada master karyawan aktif.`,
        );
      }
    }

    parsedList.push({
      code,
      employee_name: resolvedEmployeeName,
      component_type: resolvedType === "DEDUCTION" ? "POTONGAN" : "TUNJANGAN",
      component_name: comp_name,
      amount,
      frequency: frequency || "Bulanan",
      start_date: formattedStartDate,
      end_date: formattedEndDate,
      percentage,
      based_on_component: based_on || null,
      notes: notes || null,
      _row_number: rowNumber,
      _resolved_type: resolvedType,
      _validation_errors: validationErrors,
    });
  });

  return parsedList;
}
