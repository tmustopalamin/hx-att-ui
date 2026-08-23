"use client";
import { useI18n } from "@/app/i18n";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import * as XLSX from "@e965/xlsx";
import { saveAs } from "file-saver";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { TabPanel, TabView } from "primereact/tabview";

import {
  savePayrollRegulationParameter,
  savePayrollRegulationRateBracket,
  savePayrollRegulationTestCase,
  replacePayrollRegulationRateBrackets,
} from "@/app/services/payroll-configuration-service";
import type {
  PayrollRegulationDetail,
  PayrollRegulationParameter,
  PayrollRegulationPackage,
  RegulationValueType,
  SavePayrollRegulationParameter,
  SavePayrollRegulationRateBracket,
  SavePayrollRegulationTestCase,
} from "@/app/types/payroll-configuration";
import { fetcher } from "@/app/utils/fetcher";
import { formatDate as formatDisplayDate } from "@/app/utils/date-format";

interface Props {
  regulation: PayrollRegulationPackage | null;
  onHide: () => void;
  onSuccess: (message: string) => void;
  onError: (error: unknown) => void;
}

const EMPTY_PARAMETER: SavePayrollRegulationParameter = {
  program_code: "BPJS_KES",
  parameter_code: "",
  value_type: "NUMERIC",
  numeric_value: "",
  text_value: null,
  boolean_value: null,
  date_value: null,
  unit: null,
  description: null,
};
const EMPTY_BRACKET: SavePayrollRegulationRateBracket = {
  table_code: "PPH21_TER",
  category_code: "A",
  sequence_no: 1,
  lower_bound: "0",
  upper_bound: null,
  rate: "0",
  fixed_amount: "0",
};
const EMPTY_TEST: SavePayrollRegulationTestCase = {
  code: "",
  name: "",
  calculator_code: "PPH21",
  input_json: {},
  expected_output_json: {},
  tolerance: "0",
  is_active: true,
};

type ImportPreview = {
  brackets: SavePayrollRegulationRateBracket[];
  errors: string[];
  additions: number;
  changes: number;
  deletions: number;
};

const parameterLabels: Record<string, string> = {
  JOB_EXPENSE_ANNUAL_CAP: "Batas biaya jabatan tahunan",
  JOB_EXPENSE_RATE: "Tarif biaya jabatan",
  NON_PERMANENT_DAILY_ARTICLE17_BASE: "Dasar tarif Pasal 17 harian",
  NON_PERMANENT_DAILY_TER_MAX: "Batas TER harian",
  NON_PERMANENT_DAILY_ZERO_THRESHOLD: "Batas tidak dipotong harian",
  PTKP_K3: "PTKP K/3",
  PTKP_TK0: "PTKP TK/0",
  PTKP_TK1_K0: "PTKP TK/1 atau K/0",
  PTKP_TK2_K1: "PTKP TK/2 atau K/1",
  PTKP_TK3_K2: "PTKP TK/3 atau K/2",
};

const bracketKey = (bracket: SavePayrollRegulationRateBracket) =>
  `${bracket.table_code.toUpperCase()}|${bracket.category_code.toUpperCase()}|${bracket.sequence_no}`;

const decimal = (value: unknown): string | null => {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }
  const raw = String(value).trim();
  const normalized =
    raw.includes(",") && !raw.includes(".")
      ? raw.replace(",", ".")
      : raw.replace(/,/g, "");
  return Number.isFinite(Number(normalized)) ? normalized : null;
};

const parseRatePercent = (value: unknown): string | null => {
  const parsed = decimal(value);
  if (parsed === null) return null;
  const numeric = Number(parsed);
  return Number.isFinite(numeric) ? String(numeric / 100) : null;
};

const validateImportedBrackets = (
  brackets: SavePayrollRegulationRateBracket[],
) => {
  const errors: string[] = [];
  const groups = new Map<string, SavePayrollRegulationRateBracket[]>();
  for (const bracket of brackets) {
    const key = `${bracket.table_code.toUpperCase()}|${bracket.category_code.toUpperCase()}`;
    const group = groups.get(key) ?? [];
    group.push(bracket);
    groups.set(key, group);
    if (bracket.sequence_no <= 0)
      errors.push(`${key}: sequence harus lebih besar dari 0.`);
    if (
      Number(bracket.lower_bound) < 0 ||
      Number(bracket.rate) < 0 ||
      Number(bracket.fixed_amount) < 0
    ) {
      errors.push(`${key} #${bracket.sequence_no}: nilai tidak boleh negatif.`);
    }
    if (
      bracket.upper_bound !== null &&
      Number(bracket.upper_bound) <= Number(bracket.lower_bound)
    ) {
      errors.push(
        `${key} #${bracket.sequence_no}: batas atas harus lebih besar dari batas bawah.`,
      );
    }
  }
  for (const [key, group] of groups) {
    group.sort((left, right) => left.sequence_no - right.sequence_no);
    const seen = new Set<number>();
    group.forEach((bracket, index) => {
      if (seen.has(bracket.sequence_no)) {
        errors.push(`${key}: sequence ${bracket.sequence_no} duplikat.`);
      }
      seen.add(bracket.sequence_no);
      if (bracket.sequence_no !== index + 1) {
        errors.push(`${key}: sequence harus berurutan mulai dari 1.`);
      }
      if (index === 0 && Number(bracket.lower_bound) !== 0) {
        errors.push(`${key}: batas bawah pertama harus 0.`);
      }
      const next = group[index + 1];
      if (next && bracket.upper_bound !== next.lower_bound) {
        errors.push(
          `${key}: ada gap atau overlap antara sequence ${bracket.sequence_no} dan ${next.sequence_no}.`,
        );
      }
    });
  }
  return errors;
};

export default function PayrollRegulationDetailDialog({
  regulation,
  onHide,
  onSuccess,
  onError,
}: Props) {
  const { t: i18nT } = useI18n();
  const detailUrl = regulation
    ? `/api/payroll-regulations/${regulation.id}/detail`
    : null;
  const { data, isLoading, mutate } = useSWR<PayrollRegulationDetail>(
    detailUrl,
    fetcher,
  );
  const [parameter, setParameter] = useState(EMPTY_PARAMETER);
  const [bracket, setBracket] = useState(EMPTY_BRACKET);
  const [testCase, setTestCase] = useState(EMPTY_TEST);
  const [inputJson, setInputJson] = useState("{}");
  const [expectedJson, setExpectedJson] = useState("{}");
  const [saving, setSaving] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editable = regulation?.status === "DRAFT";

  useEffect(() => {
    setAdvanced(false);
    setImportPreview(null);
  }, [regulation?.id]);

  const execute = async (
    action: () => Promise<unknown>,
    message: string,
  ): Promise<boolean> => {
    try {
      setSaving(true);
      await action();
      await mutate();
      onSuccess(message);
      return true;
    } catch (error: unknown) {
      onError(error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveParameter = () => {
    if (!regulation) return;
    const valueType = parameter.value_type;
    void execute(
      () =>
        savePayrollRegulationParameter(regulation.id, {
          ...parameter,
          numeric_value:
            valueType === "NUMERIC" ? parameter.numeric_value : null,
          text_value: valueType === "TEXT" ? parameter.text_value : null,
          boolean_value:
            valueType === "BOOLEAN" ? parameter.boolean_value : null,
          date_value: valueType === "DATE" ? parameter.date_value : null,
        }),
      "Regulation parameter saved.",
    );
  };

  const saveSimpleParameter = (value: SavePayrollRegulationParameter) => {
    if (!regulation) return;
    void execute(
      () => savePayrollRegulationParameter(regulation.id, value),
      "Regulation parameter saved.",
    );
  };

  const saveBracket = () => {
    if (!regulation) return;
    void execute(
      () => savePayrollRegulationRateBracket(regulation.id, bracket),
      "Rate bracket saved.",
    );
  };

  const downloadBracketTemplate = () => {
    const instructions = [
      [
        "Petunjuk",
        "Isi sheet Rate Brackets. Satu baris untuk satu rentang tarif.",
      ],
      ["Table", "Kode tabel, contoh TER_MONTHLY"],
      ["Category", "Kategori tabel, contoh A atau DEFAULT"],
      ["Sequence", "Urutan mulai dari 1"],
      ["Upper Limit", "Batas atas; kosongkan pada rentang terakhir"],
      ["Rate (%)", "Tarif dalam persen, contoh 0.5 berarti 0,5%"],
      ["Fixed Amount", "Nominal tetap dalam IDR; biasanya 0"],
    ];
    const rows = [
      [
        "Table",
        "Category",
        "Sequence",
        "Upper Limit",
        "Rate (%)",
        "Fixed Amount",
      ],
      ["TER_MONTHLY", "A", 1, 5400000.01, 0, 0],
      ["TER_MONTHLY", "A", 2, 5650000.01, 0.25, 0],
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(instructions),
      "Instructions",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(rows),
      "Rate Brackets",
    );
    const fileData = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([fileData]), "payroll-rate-brackets-template.xlsx");
  };

  const importBracketFile = async (file: File) => {
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheetName =
        workbook.SheetNames.find((name) =>
          name.toLowerCase().includes("rate"),
        ) ?? workbook.SheetNames[0];
      if (!sheetName)
        throw new Error("Workbook tidak memiliki sheet rate bracket.");
      const rows = XLSX.utils.sheet_to_json<unknown[]>(
        workbook.Sheets[sheetName],
        {
          header: 1,
          defval: "",
          raw: true,
        },
      );
      const headerIndex = rows.findIndex((row) =>
        String(row[0] ?? "")
          .toLowerCase()
          .includes("table"),
      );
      if (headerIndex < 0) throw new Error("Header Table tidak ditemukan.");
      const headers = rows[headerIndex].map((value) =>
        String(value).trim().toLowerCase(),
      );
      const column = (names: string[]) =>
        headers.findIndex((header) => names.some((name) => header === name));
      const tableIndex = column(["table", "table code"]);
      const categoryIndex = column(["category", "category code"]);
      const sequenceIndex = column(["sequence", "seq.", "seq"]);
      const upperIndex = column(["upper limit", "upper", "batas atas"]);
      const rateIndex = column(["rate (%)", "rate", "tarif (%)"]);
      const fixedIndex = column(["fixed amount", "fixed", "nominal tetap"]);
      if (
        [
          tableIndex,
          categoryIndex,
          sequenceIndex,
          upperIndex,
          rateIndex,
          fixedIndex,
        ].some((index) => index < 0)
      ) {
        throw new Error(
          "Kolom wajib: Table, Category, Sequence, Upper Limit, Rate (%), Fixed Amount.",
        );
      }
      const lowerBounds = new Map<string, string>();
      const brackets: SavePayrollRegulationRateBracket[] = [];
      for (const row of rows.slice(headerIndex + 1)) {
        if (row.every((value) => String(value ?? "").trim() === "")) continue;
        const table = String(row[tableIndex] ?? "").trim();
        const category = String(row[categoryIndex] ?? "").trim() || "DEFAULT";
        const sequence = Number(row[sequenceIndex]);
        const upper = decimal(row[upperIndex]);
        const rate = parseRatePercent(row[rateIndex]);
        const fixed = decimal(row[fixedIndex]) ?? "0";
        const key = `${table.toUpperCase()}|${category.toUpperCase()}`;
        if (!table) {
          throw new Error("Kolom Table tidak boleh kosong.");
        }
        if (!Number.isInteger(sequence)) {
          throw new Error(
            `Sequence pada ${table} harus berupa bilangan bulat.`,
          );
        }
        if (rate === null) {
          throw new Error(`Rate pada ${table} #${sequence} tidak valid.`);
        }
        brackets.push({
          table_code: table,
          category_code: category,
          sequence_no: sequence,
          lower_bound: lowerBounds.get(key) ?? "0",
          upper_bound: upper,
          rate,
          fixed_amount: fixed,
        });
        if (upper !== null) lowerBounds.set(key, upper);
      }
      if (!brackets.length)
        throw new Error("Tidak ada baris bracket yang dapat diimpor.");
      const errors = validateImportedBrackets(brackets);
      const existing = new Map(
        (data?.rate_brackets ?? []).map((item) => [bracketKey(item), item]),
      );
      const incoming = new Map(
        brackets.map((item) => [bracketKey(item), item]),
      );
      let additions = 0;
      let changes = 0;
      let deletions = 0;
      for (const [key, item] of incoming) {
        const current = existing.get(key);
        if (!current) additions += 1;
        else if (
          (
            ["lower_bound", "upper_bound", "rate", "fixed_amount"] as const
          ).some((field) => String(current[field]) !== String(item[field]))
        ) {
          changes += 1;
        }
      }
      for (const key of existing.keys()) if (!incoming.has(key)) deletions += 1;
      setImportPreview({ brackets, errors, additions, changes, deletions });
    } catch (error: unknown) {
      onError(error);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const saveImportedBrackets = () => {
    if (!regulation || !importPreview || importPreview.errors.length) return;
    void execute(
      () =>
        replacePayrollRegulationRateBrackets(
          regulation.id,
          regulation.row_version,
          {
            brackets: importPreview.brackets,
          },
        ),
      "Rate bracket table imported.",
    ).then((success) => {
      if (success) setImportPreview(null);
    });
  };

  const saveTestCase = () => {
    if (!regulation) return;
    try {
      const parsedInput: unknown = JSON.parse(inputJson);
      const parsedExpected: unknown = JSON.parse(expectedJson);
      if (
        typeof parsedInput !== "object" ||
        parsedInput === null ||
        Array.isArray(parsedInput) ||
        typeof parsedExpected !== "object" ||
        parsedExpected === null ||
        Array.isArray(parsedExpected)
      ) {
        throw new Error("Input and expected output must be JSON objects.");
      }
      void execute(
        () =>
          savePayrollRegulationTestCase(regulation.id, {
            ...testCase,
            input_json: parsedInput as Record<string, unknown>,
            expected_output_json: parsedExpected as Record<string, unknown>,
          }),
        "Regulation test case saved.",
      );
    } catch (error: unknown) {
      onError(error);
    }
  };

  return (
    <Dialog
      header={
        regulation
          ? i18nT("static.19gk9r6", {
              p0: regulation.code,
              p1: regulation.version,
            })
          : i18nT("static.1prsb9")
      }
      visible={regulation !== null}
      onHide={onHide}
      modal
      draggable={false}
      resizable={false}
      maximizable
      style={{ width: "96vw", maxWidth: "72rem" }}
    >
      {!editable && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {i18nT("static.gvhss7")} {regulation?.status}
          {i18nT("static.g9vfsy")}{" "}
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-slate-700">
            {i18nT("static.gm2srv")}{" "}
          </div>
          <div className="text-xs leading-5 text-slate-500">
            {i18nT("static.1k3si3x")}{" "}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span>{i18nT("static.qwfkor")}</span>
          <InputSwitch
            checked={advanced}
            onChange={(event) => setAdvanced(Boolean(event.value))}
          />
        </div>
      </div>
      <TabView>
        <TabPanel
          header={i18nT("static.14r9r1n", {
            p0: advanced ? i18nT("static.1yc4h6h") : i18nT("static.s0ct7f"),
            p1: data?.parameters.length ?? 0,
          })}
        >
          {editable && advanced && (
            <div className="mb-5 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-4">
              <Field label={i18nT("static.1if8prf")}>
                <InputText
                  value={parameter.program_code}
                  onChange={(event) =>
                    setParameter((value) => ({
                      ...value,
                      program_code: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label={i18nT("static.6qkf5c")}>
                <InputText
                  value={parameter.parameter_code}
                  onChange={(event) =>
                    setParameter((value) => ({
                      ...value,
                      parameter_code: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label={i18nT("static.1nx8gbi")}>
                <Dropdown
                  value={parameter.value_type}
                  options={
                    [
                      "NUMERIC",
                      "TEXT",
                      "BOOLEAN",
                      "DATE",
                    ] satisfies RegulationValueType[]
                  }
                  onChange={(event) =>
                    setParameter((value) => ({
                      ...value,
                      value_type: event.value as RegulationValueType,
                    }))
                  }
                />
              </Field>
              <ParameterValue
                parameter={parameter}
                setParameter={setParameter}
              />
              <div className="md:col-span-4 flex justify-end">
                <Button
                  label={i18nT("static.jc883r")}
                  icon="pi pi-check"
                  size="small"
                  loading={saving}
                  onClick={saveParameter}
                />
              </div>
            </div>
          )}
          <DataTable
            value={data?.parameters ?? []}
            loading={isLoading}
            size="small"
            stripedRows
          >
            {advanced && (
              <Column field="program_code" header={i18nT("static.1if8prf")} />
            )}
            <Column
              field="parameter_code"
              header={
                advanced ? i18nT("static.6qkf5c") : i18nT("static.1lp52qk")
              }
              body={(row) =>
                advanced
                  ? row.parameter_code
                  : (parameterLabels[row.parameter_code] ?? row.parameter_code)
              }
            />
            {advanced && (
              <Column field="value_type" header={i18nT("static.1m2zofh")} />
            )}
            <Column
              header={i18nT("static.1m2g8kq")}
              body={(row) =>
                advanced ? (
                  row.value_type === "DATE" ? (
                    formatDisplayDate(row.date_value)
                  ) : (
                    String(
                      row.numeric_value ??
                        row.text_value ??
                        row.boolean_value ??
                        row.date_value ??
                        "",
                    )
                  )
                ) : (
                  <SimpleParameterEditor
                    parameter={row}
                    editable={editable}
                    saving={saving}
                    onSave={saveSimpleParameter}
                  />
                )
              }
            />
            <Column field="unit" header={i18nT("static.t3mdrb")} />
            {!advanced && (
              <Column field="description" header={i18nT("static.1uvl8yn")} />
            )}
          </DataTable>
        </TabPanel>

        <TabPanel
          header={i18nT("static.14r9r1n", {
            p0: advanced ? i18nT("static.r72qkg") : i18nT("static.1t92np0"),
            p1: data?.rate_brackets.length ?? 0,
          })}
        >
          {editable && (
            <div className="mb-5 flex flex-col gap-3 rounded-lg border border-blue-100 bg-blue-50/50 p-4">
              <div>
                <div className="text-sm font-semibold text-slate-700">
                  {i18nT("static.6dync6")}{" "}
                </div>
                <div className="text-xs leading-5 text-slate-500">
                  {i18nT("static.17ucfwz")}{" "}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {advanced && (
                  <div className="grid w-full grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-4">
                    {(
                      [
                        "table_code",
                        "category_code",
                        "sequence_no",
                        "lower_bound",
                        "upper_bound",
                        "rate",
                        "fixed_amount",
                      ] as const
                    ).map((key) => (
                      <Field key={key} label={key.replaceAll("_", " ")}>
                        <InputText
                          value={String(bracket[key] ?? "")}
                          onChange={(event) =>
                            setBracket((value) => ({
                              ...value,
                              [key]:
                                key === "sequence_no"
                                  ? Number(event.target.value)
                                  : event.target.value || null,
                            }))
                          }
                        />
                      </Field>
                    ))}
                  </div>
                )}
                <Button
                  label={i18nT("static.1gi3eax")}
                  icon="pi pi-download"
                  size="small"
                  severity="secondary"
                  outlined
                  onClick={downloadBracketTemplate}
                />
                <Button
                  label={i18nT("static.t5uxra")}
                  icon="pi pi-upload"
                  size="small"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={saving}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void importBracketFile(file);
                  }}
                />
                {advanced && (
                  <Button
                    label={i18nT("static.cnw5go")}
                    icon="pi pi-plus"
                    size="small"
                    severity="secondary"
                    outlined
                    loading={saving}
                    onClick={saveBracket}
                  />
                )}
              </div>
              {importPreview && (
                <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
                    <span>
                      {i18nT("static.1qys2u6")} <b>{importPreview.additions}</b>
                    </span>
                    <span>
                      {i18nT("static.14n9vnr")} <b>{importPreview.changes}</b>
                    </span>
                    <span>
                      {i18nT("static.11bkrvw")} <b>{importPreview.deletions}</b>
                    </span>
                  </div>
                  {importPreview.errors.length > 0 ? (
                    <div className="text-xs leading-5 text-red-600">
                      {importPreview.errors.slice(0, 8).map((error) => (
                        <div key={error}>
                          {i18nT("static.syyan8")} {error}
                        </div>
                      ))}
                      {importPreview.errors.length > 8 && (
                        <div>
                          {i18nT("static.119x31m")}{" "}
                          {importPreview.errors.length - 8}{" "}
                          {i18nT("static.1l8ucpr")}{" "}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3 text-xs text-emerald-700">
                      <span>{i18nT("static.1v2d0a2")} </span>
                      <Button
                        label={i18nT("static.1iyrnnn")}
                        icon="pi pi-check"
                        size="small"
                        loading={saving}
                        onClick={saveImportedBrackets}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <DataTable
            value={data?.rate_brackets ?? []}
            loading={isLoading}
            size="small"
            stripedRows
          >
            {advanced && (
              <Column field="table_code" header={i18nT("static.1no2um7")} />
            )}
            <Column
              field="category_code"
              header={i18nT("static.101orop")}
              body={(row) =>
                advanced
                  ? row.category_code
                  : row.category_code === "DEFAULT"
                    ? "Default"
                    : `Kategori ${row.category_code}`
              }
            />
            {advanced && (
              <Column field="sequence_no" header={i18nT("static.g9r8fq")} />
            )}
            <Column
              header={
                advanced ? i18nT("static.i6s4m2") : i18nT("static.1uofg23")
              }
              body={(row) => row.lower_bound}
            />
            <Column
              header={
                advanced ? i18nT("static.1dlklwn") : i18nT("static.1paw5c2")
              }
              body={(row) => row.upper_bound ?? "Tidak terbatas"}
            />
            <Column
              header={i18nT("static.1fpn4rv")}
              body={(row) =>
                `${(Number(row.rate) * 100).toLocaleString("id-ID")} %`
              }
            />
            {advanced && (
              <Column field="fixed_amount" header={i18nT("static.1n6jfv3")} />
            )}
          </DataTable>
        </TabPanel>

        {advanced && (
          <TabPanel
            header={i18nT("static.1p27x87", {
              p0: data?.test_cases.length ?? 0,
            })}
          >
            {editable && (
              <div className="mb-5 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-3">
                <Field label={i18nT("static.xoaiok")}>
                  <InputText
                    value={testCase.code}
                    onChange={(event) =>
                      setTestCase((value) => ({
                        ...value,
                        code: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label={i18nT("static.4el6o6")}>
                  <InputText
                    value={testCase.name}
                    onChange={(event) =>
                      setTestCase((value) => ({
                        ...value,
                        name: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label={i18nT("static.o6bvql")}>
                  <InputText
                    value={testCase.calculator_code}
                    onChange={(event) =>
                      setTestCase((value) => ({
                        ...value,
                        calculator_code: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label={i18nT("static.1tpnjsv")}>
                  <InputText
                    value={inputJson}
                    onChange={(event) => setInputJson(event.target.value)}
                  />
                </Field>
                <Field label={i18nT("static.axisex")}>
                  <InputText
                    value={expectedJson}
                    onChange={(event) => setExpectedJson(event.target.value)}
                  />
                </Field>
                <Field label={i18nT("static.1llx3uw")}>
                  <InputText
                    value={testCase.tolerance}
                    onChange={(event) =>
                      setTestCase((value) => ({
                        ...value,
                        tolerance: event.target.value,
                      }))
                    }
                  />
                </Field>
                <div className="md:col-span-3 flex justify-end">
                  <Button
                    label={i18nT("static.sqhdrc")}
                    icon="pi pi-check"
                    size="small"
                    loading={saving}
                    onClick={saveTestCase}
                  />
                </div>
              </div>
            )}
            <DataTable
              value={data?.test_cases ?? []}
              loading={isLoading}
              size="small"
              stripedRows
            >
              <Column field="code" header={i18nT("static.xoaiok")} />
              <Column field="name" header={i18nT("static.4el6o6")} />
              <Column field="calculator_code" header={i18nT("static.o6bvql")} />
              <Column field="tolerance" header={i18nT("static.1llx3uw")} />
              <Column
                field="is_active"
                header={i18nT("static.8qzyhb")}
                body={(row) => (row.is_active ? "Yes" : "No")}
              />
            </DataTable>
          </TabPanel>
        )}
      </TabView>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2 capitalize">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function ParameterValue({
  parameter,
  setParameter,
}: {
  parameter: SavePayrollRegulationParameter;
  setParameter: React.Dispatch<
    React.SetStateAction<SavePayrollRegulationParameter>
  >;
}) {
  const { t: i18nT } = useI18n();
  if (parameter.value_type === "BOOLEAN") {
    return (
      <Field label={i18nT("static.1m2g8kq")}>
        <InputSwitch
          checked={parameter.boolean_value ?? false}
          onChange={(event) =>
            setParameter((value) => ({
              ...value,
              boolean_value: Boolean(event.value),
            }))
          }
        />
      </Field>
    );
  }
  const key =
    parameter.value_type === "NUMERIC"
      ? "numeric_value"
      : parameter.value_type === "DATE"
        ? "date_value"
        : "text_value";
  return (
    <Field label={i18nT("static.1m2g8kq")}>
      <InputText
        type={parameter.value_type === "DATE" ? "date" : "text"}
        value={parameter[key] ?? ""}
        onChange={(event) =>
          setParameter((value) => ({ ...value, [key]: event.target.value }))
        }
      />
    </Field>
  );
}

function SimpleParameterEditor({
  parameter,
  editable,
  saving,
  onSave,
}: {
  parameter: PayrollRegulationParameter;
  editable: boolean;
  saving: boolean;
  onSave: (value: SavePayrollRegulationParameter) => void;
}) {
  const { t: i18nT } = useI18n();
  const [value, setValue] = useState(
    parameter.value_type === "NUMERIC"
      ? (parameter.numeric_value ?? "")
      : parameter.value_type === "TEXT"
        ? (parameter.text_value ?? "")
        : parameter.value_type === "BOOLEAN"
          ? (parameter.boolean_value ?? false)
          : (parameter.date_value ?? ""),
  );

  useEffect(() => {
    setValue(
      parameter.value_type === "NUMERIC"
        ? (parameter.numeric_value ?? "")
        : parameter.value_type === "TEXT"
          ? (parameter.text_value ?? "")
          : parameter.value_type === "BOOLEAN"
            ? (parameter.boolean_value ?? false)
            : (parameter.date_value ?? ""),
    );
  }, [
    parameter.boolean_value,
    parameter.date_value,
    parameter.numeric_value,
    parameter.text_value,
    parameter.value_type,
  ]);

  if (!editable) {
    return parameter.value_type === "DATE"
      ? formatDisplayDate(parameter.date_value)
      : String(value);
  }

  const payload: SavePayrollRegulationParameter = {
    program_code: parameter.program_code,
    parameter_code: parameter.parameter_code,
    value_type: parameter.value_type,
    numeric_value: parameter.value_type === "NUMERIC" ? String(value) : null,
    text_value: parameter.value_type === "TEXT" ? String(value) : null,
    boolean_value: parameter.value_type === "BOOLEAN" ? Boolean(value) : null,
    date_value: parameter.value_type === "DATE" ? String(value) : null,
    unit: parameter.unit,
    description: parameter.description,
  };

  return (
    <div className="flex min-w-52 items-center gap-2">
      {parameter.value_type === "BOOLEAN" ? (
        <InputSwitch
          checked={Boolean(value)}
          onChange={(event) => setValue(Boolean(event.value))}
        />
      ) : (
        <InputText
          type={parameter.value_type === "DATE" ? "date" : "text"}
          value={String(value)}
          className="min-w-0 flex-1"
          onChange={(event) => setValue(event.target.value)}
        />
      )}
      <Button
        icon="pi pi-check"
        rounded
        text
        size="small"
        tooltip={i18nT("static.1pbdmce")}
        loading={saving}
        disabled={saving}
        onClick={() => onSave(payload)}
      />
    </div>
  );
}
