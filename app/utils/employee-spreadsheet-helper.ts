import * as XLSX from "@e965/xlsx";
import { saveAs } from "file-saver";
import dayjs from "dayjs";
import { EmployeeBulkImportRow } from "../types/employee-bulk";

export interface MasterReferenceData {
  agencies?: Array<{ id: number; name: string }>;
  branches?: Array<{ id: number; name: string }>;
  departments?: Array<{ id: number; name: string }>;
  positions?: Array<{ id: number; name: string }>;
  supervisors?: Array<{ id: number; code?: string | null; name: string }>;
  banks?: Array<{ id: number; name: string; code?: string | null }>;
  genders?: Array<{ id: number; name: string }>;
  religions?: Array<{ id: number; name: string }>;
  maritalStatuses?: Array<{ id: string; name: string }>;
}

export const TEMPLATE_COLUMNS: Array<{
  header: string;
  field: keyof EmployeeBulkImportRow;
  required?: boolean;
  width?: number;
}> = [
  { header: "NIK / Employee Code*", field: "code", required: true, width: 20 },
  { header: "Nama Depan*", field: "first_name", required: true, width: 18 },
  { header: "Nama Tengah", field: "middle_name", width: 18 },
  { header: "Nama Belakang*", field: "last_name", required: true, width: 18 },
  { header: "Nama Panggilan", field: "preferred_name", width: 16 },
  { header: "Tempat Lahir*", field: "birth_place", required: true, width: 18 },
  {
    header: "Tanggal Lahir* (YYYY-MM-DD)",
    field: "dob",
    required: true,
    width: 22,
  },
  { header: "Jenis Kelamin*", field: "gender", required: true, width: 16 },
  { header: "Agama", field: "religion", width: 16 },
  { header: "Status Pernikahan", field: "marital_status", width: 18 },
  { header: "No. Telepon / HP", field: "phone_number", width: 18 },
  { header: "Email Pribadi", field: "personal_email", width: 25 },
  { header: "Email Kantor", field: "work_email", width: 25 },
  { header: "Perusahaan / Agency", field: "agency_name", width: 25 },
  { header: "Cabang / Branch", field: "branch_name", width: 25 },
  { header: "Departemen", field: "department_name", width: 22 },
  { header: "Jabatan / Position", field: "position_name", width: 22 },
  { header: "Atasan Langsung / Supervisor", field: "supervisor", width: 26 },
  { header: "Status Karyawan", field: "employment_status_name", width: 18 },
  { header: "Tanggal Bergabung (YYYY-MM-DD)", field: "join_date", width: 24 },
  { header: "Nama Bank", field: "bank_name", width: 18 },
  { header: "Nomor Rekening", field: "bank_account_number", width: 20 },
  { header: "Nama Pemilik Rekening", field: "bank_account_holder", width: 24 },
  { header: "Gaji Pokok", field: "base_salary", width: 18 },
  { header: "NPWP", field: "npwp", width: 22 },
  { header: "Status PTKP", field: "ptkp_code", width: 15 },
  { header: "Metode Pajak", field: "tax_method", width: 16 },
  {
    header: "No. BPJS Ketenagakerjaan",
    field: "bpjs_ketenagakerjaan_number",
    width: 24,
  },
  { header: "No. BPJS Kesehatan", field: "bpjs_kesehatan_number", width: 20 },
];

export const SAMPLE_ROWS: Record<string, string | number>[] = [
  {
    "NIK / Employee Code*": "EMP001",
    "Nama Depan*": "Budi",
    "Nama Tengah": "Santoso",
    "Nama Belakang*": "Prasetyo",
    "Nama Panggilan": "Budi",
    "Tempat Lahir*": "Jakarta",
    "Tanggal Lahir* (YYYY-MM-DD)": "1992-05-14",
    "Jenis Kelamin*": "Laki-laki",
    Agama: "Islam",
    "Status Pernikahan": "Menikah",
    "No. Telepon / HP": "081234567890",
    "Email Pribadi": "budi.prasetyo@gmail.com",
    "Email Kantor": "budi@hexing.com",
    "Perusahaan / Agency": "PT. Hexing Technology",
    "Cabang / Branch": "Kantor Pusat Jakarta",
    Departemen: "Information Technology",
    "Jabatan / Position": "Senior Software Engineer",
    "Atasan Langsung / Supervisor": "",
    "Status Karyawan": "PKWTT",
    "Tanggal Bergabung (YYYY-MM-DD)": "2023-01-10",
    "Nama Bank": "BCA",
    "Nomor Rekening": "5220394811",
    "Nama Pemilik Rekening": "Budi Santoso Prasetyo",
    "Gaji Pokok": 9500000,
    NPWP: "09.123.456.7-890.000",
    "Status PTKP": "K/1",
    "Metode Pajak": "GROSS",
    "No. BPJS Ketenagakerjaan": "12345678901",
    "No. BPJS Kesehatan": "00012345678",
  },
  {
    "NIK / Employee Code*": "EMP002",
    "Nama Depan*": "Siti",
    "Nama Tengah": "",
    "Nama Belakang*": "Nurhaliza",
    "Nama Panggilan": "Siti",
    "Tempat Lahir*": "Bandung",
    "Tanggal Lahir* (YYYY-MM-DD)": "1995-11-20",
    "Jenis Kelamin*": "Perempuan",
    Agama: "Islam",
    "Status Pernikahan": "Belum Menikah",
    "No. Telepon / HP": "081987654321",
    "Email Pribadi": "siti.nur@gmail.com",
    "Email Kantor": "siti@hexing.com",
    "Perusahaan / Agency": "PT. Hexing Technology",
    "Cabang / Branch": "Kantor Pusat Jakarta",
    Departemen: "Finance",
    "Jabatan / Position": "Finance Officer",
    "Atasan Langsung / Supervisor": "",
    "Status Karyawan": "PKWT",
    "Tanggal Bergabung (YYYY-MM-DD)": "2024-03-01",
    "Nama Bank": "Mandiri",
    "Nomor Rekening": "137001928374",
    "Nama Pemilik Rekening": "Siti Nurhaliza",
    "Gaji Pokok": 7000000,
    NPWP: "12.345.678.9-012.000",
    "Status PTKP": "TK/0",
    "Metode Pajak": "GROSS",
    "No. BPJS Ketenagakerjaan": "23456789012",
    "No. BPJS Kesehatan": "00023456789",
  },
];

export function generateEmployeeTemplate(references: MasterReferenceData = {}) {
  const wb = XLSX.utils.book_new();

  // 1. Sheet Utama: Data Karyawan
  const wsData = XLSX.utils.json_to_sheet(SAMPLE_ROWS, {
    header: TEMPLATE_COLUMNS.map((c) => c.header),
  });

  wsData["!cols"] = TEMPLATE_COLUMNS.map((c) => ({
    wch: c.width || 18,
  }));

  if (wsData["!ref"]) {
    wsData["!autofilter"] = { ref: wsData["!ref"] };
  }

  XLSX.utils.book_append_sheet(wb, wsData, "Data Karyawan");

  // 2. Sheet Panduan & Referensi
  const defaultGenders = ["Laki-laki", "Perempuan"];
  const defaultReligions = [
    "Islam",
    "Kristen Protestan",
    "Katolik",
    "Hindu",
    "Buddha",
    "Khonghucu",
  ];
  const defaultMaritals = [
    "Belum Menikah",
    "Menikah",
    "Cerai Hidup",
    "Cerai Mati",
  ];
  const defaultStatus = [
    "PKWTT (Tetap)",
    "PKWT (Kontrak)",
    "Probation (Percobaan)",
    "Internship (Magang)",
  ];

  const supervisorList =
    references.supervisors && references.supervisors.length > 0
      ? references.supervisors.map((s) =>
          s.code ? `${s.name} (${s.code})` : s.name,
        )
      : [];

  const maxRefRows = Math.max(
    references.agencies?.length || 0,
    references.branches?.length || 0,
    references.departments?.length || 0,
    references.positions?.length || 0,
    references.banks?.length || 0,
    references.religions?.length || 0,
    supervisorList.length,
    10,
  );

  const refDataRows: Record<string, string>[] = [];
  const ptkpOptions = [
    "TK/0",
    "TK/1",
    "TK/2",
    "TK/3",
    "K/0",
    "K/1",
    "K/2",
    "K/3",
  ];
  const taxMethods = ["GROSS", "NET", "GROSS_UP"];

  for (let i = 0; i < maxRefRows; i++) {
    const rowObj: Record<string, string> = {
      "Perusahaan / Agency": references.agencies?.[i]?.name || "",
      Cabang: references.branches?.[i]?.name || "",
      Departemen: references.departments?.[i]?.name || "",
      Jabatan: references.positions?.[i]?.name || "",
      "Atasan / Supervisor (Pilihan)": supervisorList[i] || "",
      "Jenis Kelamin": defaultGenders[i] || "",
      Agama: references.religions?.[i]?.name || defaultReligions[i] || "",
      "Status Pernikahan":
        references.maritalStatuses?.[i]?.name || defaultMaritals[i] || "",
      "Status Karyawan": defaultStatus[i] || "",
      Bank: references.banks?.[i]?.name || "",
      "Status PTKP": ptkpOptions[i] || "",
      "Metode Pajak": taxMethods[i] || "",
    };
    refDataRows.push(rowObj);
  }

  const wsRef = XLSX.utils.json_to_sheet(refDataRows);
  wsRef["!cols"] = [
    { wch: 25 },
    { wch: 25 },
    { wch: 25 },
    { wch: 25 },
    { wch: 32 },
    { wch: 16 },
    { wch: 18 },
    { wch: 20 },
    { wch: 22 },
    { wch: 20 },
    { wch: 14 },
    { wch: 14 },
  ];

  XLSX.utils.book_append_sheet(wb, wsRef, "Pilihan Data & Referensi");

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, "template_import_karyawan.xlsx");
}

export function exportEmployeesToExcel(
  employees: Array<Record<string, unknown>>,
) {
  const wb = XLSX.utils.book_new();

  const exportRows = employees.map((emp) => {
    return {
      "NIK / Employee Code*": String(emp.code || ""),
      "Nama Depan*": String(emp.first_name || ""),
      "Nama Tengah": String(emp.middle_name || ""),
      "Nama Belakang*": String(emp.last_name || ""),
      "Nama Panggilan": String(emp.preferred_name || ""),
      "Tempat Lahir*": String(emp.birth_place || ""),
      "Tanggal Lahir* (YYYY-MM-DD)": emp.dob
        ? dayjs(emp.dob as string).format("YYYY-MM-DD")
        : "",
      "Jenis Kelamin*": String(emp.gender_name || ""),
      Agama: String(emp.religion_name || ""),
      "Status Pernikahan": String(emp.marital_status_name || ""),
      "No. Telepon / HP": String(emp.phone_number || ""),
      "Email Pribadi": String(emp.personal_email || ""),
      "Email Kantor": String(emp.work_email || ""),
      "Perusahaan / Agency": String(emp.agency_name || ""),
      "Cabang / Branch": String(emp.branch_name || ""),
      Departemen: String(emp.department_name || ""),
      "Jabatan / Position": String(emp.position_name || ""),
      "Atasan Langsung / Supervisor": String(
        (emp as any).supervisor_name ||
          (emp as any).supervisor_employee_name ||
          (emp as any).supervisor_code ||
          "",
      ),
      "Status Karyawan": String(emp.employment_status_name || ""),
      "Tanggal Bergabung (YYYY-MM-DD)": emp.join_date
        ? dayjs(emp.join_date as string).format("YYYY-MM-DD")
        : "",
      "Nama Bank": String(emp.bank_name || ""),
      "Nomor Rekening": String(emp.bank_account_number || ""),
      "Nama Pemilik Rekening": String(emp.bank_account_holder || ""),
      "Gaji Pokok": String(emp.base_salary || ""),
      NPWP: String(emp.npwp || ""),
      "Status PTKP": String(emp.ptkp_code || ""),
      "Metode Pajak": String(emp.tax_method || "GROSS"),
      "No. BPJS Ketenagakerjaan": String(emp.bpjs_ketenagakerjaan_number || ""),
      "No. BPJS Kesehatan": String(emp.bpjs_kesehatan_number || ""),
    };
  });

  const ws = XLSX.utils.json_to_sheet(exportRows, {
    header: TEMPLATE_COLUMNS.map((c) => c.header),
  });

  ws["!cols"] = TEMPLATE_COLUMNS.map((c) => ({
    wch: c.width || 18,
  }));

  if (ws["!ref"]) {
    ws["!autofilter"] = { ref: ws["!ref"] };
  }

  XLSX.utils.book_append_sheet(wb, ws, "Data Karyawan");

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `data_karyawan_${dayjs().format("YYYYMMDD_HHmmss")}.xlsx`);
}

function normalizeDate(val: unknown): string {
  if (!val) return "";
  if (val instanceof Date && !isNaN(val.getTime())) {
    return dayjs(val).format("YYYY-MM-DD");
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  const parsed = dayjs(str);
  if (parsed.isValid()) {
    return parsed.format("YYYY-MM-DD");
  }
  return str;
}

export async function parseEmployeeSpreadsheet(
  file: File,
  existingCodes: Set<string> = new Set(),
): Promise<EmployeeBulkImportRow[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });

  const sheetName =
    wb.SheetNames.find((s) => s.toLowerCase().includes("karyawan")) ||
    wb.SheetNames[0];

  if (!sheetName) {
    throw new Error("File Excel tidak memiliki sheet yang valid.");
  }

  const ws = wb.Sheets[sheetName];
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, {
    defval: "",
    raw: false,
  });

  if (rawRows.length === 0) {
    throw new Error("File Excel tidak berisi data (lembar kerja kosong).");
  }

  const result: EmployeeBulkImportRow[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const r = rawRows[i];
    const rowNum = i + 2; // Row in excel (1 is header)

    // Match columns case-insensitively
    const getVal = (patterns: string[]): string => {
      for (const key of Object.keys(r)) {
        const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
        for (const p of patterns) {
          const cleanPattern = p.toLowerCase().replace(/[^a-z0-9]/g, "");
          if (cleanKey.includes(cleanPattern)) {
            return String(r[key] || "").trim();
          }
        }
      }
      return "";
    };

    const code = getVal(["code", "nik"]);
    const firstName = getVal(["namadepan", "firstname", "nama"]);
    const middleName = getVal(["namatengah", "middlename"]);
    const lastName = getVal(["namabelakang", "lastname"]);
    const preferredName = getVal(["namapanggilan", "preferredname"]);
    const birthPlace = getVal(["tempatlahir", "birthplace"]);
    const rawDob = getVal(["tanggallahir", "dob", "birthdate"]);
    const dob = normalizeDate(rawDob);
    const gender = getVal(["jeniskelamin", "gender", "sex"]);
    const religion = getVal(["agama", "religion"]);
    const maritalStatus = getVal([
      "statuspernikahan",
      "maritalstatus",
      "marital",
    ]);
    const phoneNumber = getVal(["telepon", "phone", "nohp"]);
    const personalEmail = getVal(["emailpribadi", "personalemail"]);
    const workEmail = getVal(["emailkantor", "workemail", "email"]);
    const agencyName = getVal(["perusahaan", "agency"]);
    const branchName = getVal(["cabang", "branch"]);
    const departmentName = getVal(["departemen", "department"]);
    const positionName = getVal(["jabatan", "position"]);
    const supervisor = getVal(["supervisor", "atasan", "manager"]);
    const employmentStatusName = getVal(["statuskaryawan", "employmentstatus"]);
    const rawJoinDate = getVal(["tanggalbergabung", "joindate", "masuk"]);
    const joinDate = rawJoinDate ? normalizeDate(rawJoinDate) : null;
    const bankName = getVal(["namabank", "bank"]);
    const bankAccountNumber = getVal([
      "nomorrekening",
      "rekening",
      "accountnumber",
    ]);
    const bankAccountHolder = getVal(["namapemilikrekening", "accountholder"]);
    const rawSalary = getVal(["gajipokok", "salary", "gaji"]);
    const baseSalary = rawSalary
      ? Number(rawSalary.replace(/[^0-9.]/g, "")) || null
      : null;
    const npwp = getVal(["npwp"]);
    const ptkpCode = getVal(["statusptkp", "ptkp"]);
    const taxMethod = getVal(["metodepajak", "taxmethod"]);
    const bpjsTk = getVal(["bpjsketenagakerjaan", "bpjstk"]);
    const bpjsKes = getVal(["bpjskesehatan", "bpjskes"]);

    // If completely empty row, skip
    if (!code && !firstName && !lastName) {
      continue;
    }

    const validationErrors: string[] = [];
    if (!code) validationErrors.push("NIK / Kode Karyawan belum diisi");
    if (!firstName) validationErrors.push("Nama Depan belum diisi");
    if (!lastName) validationErrors.push("Nama Belakang belum diisi");
    if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      validationErrors.push(
        "Format Tanggal Lahir harus tahun-bulan-hari (contoh: 1990-01-31)",
      );
    }
    if (!gender) validationErrors.push("Jenis Kelamin belum diisi");

    const isExisting = code ? existingCodes.has(code.toLowerCase()) : false;

    result.push({
      code,
      first_name: firstName,
      middle_name: middleName || null,
      last_name: lastName,
      preferred_name: preferredName || null,
      birth_place: birthPlace || "Indonesia",
      dob: dob || "1990-01-01",
      gender: gender || "Laki-laki",
      religion: religion || null,
      marital_status: maritalStatus || null,
      phone_number: phoneNumber || null,
      personal_email: personalEmail || null,
      work_email: workEmail || null,
      agency_name: agencyName || null,
      branch_name: branchName || null,
      department_name: departmentName || null,
      position_name: positionName || null,
      supervisor: supervisor || null,
      employment_status_name: employmentStatusName || null,
      join_date: joinDate,
      bank_name: bankName || null,
      bank_account_number: bankAccountNumber || null,
      bank_account_holder: bankAccountHolder || null,
      base_salary: baseSalary,
      npwp: npwp || null,
      ptkp_code: ptkpCode || null,
      tax_method: taxMethod || null,
      bpjs_ketenagakerjaan_number: bpjsTk || null,
      bpjs_kesehatan_number: bpjsKes || null,
      _row_number: rowNum,
      _is_existing: isExisting,
      _validation_errors: validationErrors,
    });
  }

  return result;
}
