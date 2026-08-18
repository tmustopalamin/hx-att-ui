"use client";

import { useState } from "react";
import useSWR from "swr";
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
} from "@/app/services/payroll-configuration-service";
import type {
  PayrollRegulationDetail,
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

export default function PayrollRegulationDetailDialog({
  regulation,
  onHide,
  onSuccess,
  onError,
}: Props) {
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
  const editable = regulation?.status === "DRAFT";

  const execute = async (action: () => Promise<unknown>, message: string) => {
    try {
      setSaving(true);
      await action();
      await mutate();
      onSuccess(message);
    } catch (error: unknown) {
      onError(error);
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

  const saveBracket = () => {
    if (!regulation) return;
    void execute(
      () => savePayrollRegulationRateBracket(regulation.id, bracket),
      "Rate bracket saved.",
    );
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
          ? `Configure ${regulation.code} · ${regulation.version}`
          : "Configure Regulation"
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
          This package is {regulation?.status}. Published history is read-only.
        </div>
      )}
      <TabView>
        <TabPanel header={`Parameters (${data?.parameters.length ?? 0})`}>
          {editable && (
            <div className="mb-5 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-4">
              <Field label="Program">
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
              <Field label="Parameter">
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
              <Field label="Value Type">
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
                  label="Save Parameter"
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
            <Column field="program_code" header="Program" />
            <Column field="parameter_code" header="Parameter" />
            <Column field="value_type" header="Type" />
            <Column
              header="Value"
              body={(row) =>
                row.value_type === "DATE"
                  ? formatDisplayDate(row.date_value)
                  : String(
                      row.numeric_value ??
                        row.text_value ??
                        row.boolean_value ??
                        row.date_value ??
                        "",
                    )
              }
            />
            <Column field="unit" header="Unit" />
          </DataTable>
        </TabPanel>

        <TabPanel header={`Rate Brackets (${data?.rate_brackets.length ?? 0})`}>
          {editable && (
            <div className="mb-5 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-4">
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
              <div className="col-span-2 md:col-span-4 flex justify-end">
                <Button
                  label="Save Bracket"
                  icon="pi pi-check"
                  size="small"
                  loading={saving}
                  onClick={saveBracket}
                />
              </div>
            </div>
          )}
          <DataTable
            value={data?.rate_brackets ?? []}
            loading={isLoading}
            size="small"
            stripedRows
          >
            <Column field="table_code" header="Table" />
            <Column field="category_code" header="Category" />
            <Column field="sequence_no" header="Seq." />
            <Column field="lower_bound" header="Lower" />
            <Column field="upper_bound" header="Upper" />
            <Column field="rate" header="Rate" />
            <Column field="fixed_amount" header="Fixed Amount" />
          </DataTable>
        </TabPanel>

        <TabPanel header={`Test Cases (${data?.test_cases.length ?? 0})`}>
          {editable && (
            <div className="mb-5 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-3">
              <Field label="Code">
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
              <Field label="Name">
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
              <Field label="Calculator">
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
              <Field label="Input JSON">
                <InputText
                  value={inputJson}
                  onChange={(event) => setInputJson(event.target.value)}
                />
              </Field>
              <Field label="Expected JSON">
                <InputText
                  value={expectedJson}
                  onChange={(event) => setExpectedJson(event.target.value)}
                />
              </Field>
              <Field label="Tolerance">
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
                  label="Save Test Case"
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
            <Column field="code" header="Code" />
            <Column field="name" header="Name" />
            <Column field="calculator_code" header="Calculator" />
            <Column field="tolerance" header="Tolerance" />
            <Column
              field="is_active"
              header="Active"
              body={(row) => (row.is_active ? "Yes" : "No")}
            />
          </DataTable>
        </TabPanel>
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
  if (parameter.value_type === "BOOLEAN") {
    return (
      <Field label="Value">
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
    <Field label="Value">
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
