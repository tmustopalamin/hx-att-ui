"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { useDispatch } from "react-redux";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { ConfirmDialog } from "primereact/confirmdialog";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";
import { TabPanel, TabView } from "primereact/tabview";

import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import {
  createPayrollRegulation,
  runPayrollRegulationTests,
  transitionPayrollRegulation,
  updatePayrollSetting,
} from "@/app/services/payroll-configuration-service";
import type {
  NewPayrollRegulationPackage,
  PayrollRegulationPackage,
  PayrollRegulationStatus,
  PayrollRegulationTestCaseResult,
  PayrollRegulationTestRun,
  PayrollSetting,
  UpdatePayrollSetting,
} from "@/app/types/payroll-configuration";
import type { ResponseTypeError } from "@/app/types/response-type";
import { fetcher } from "@/app/utils/fetcher";
import { showToast } from "@/store/ToastSlice";
import PayrollRegulationDetailDialog from "./PayrollRegulationDetailDialog";
import PayrollComponentMappingPanel from "./PayrollComponentMappingPanel";

const SETTING_URL = "/api/payroll-settings";
const REGULATION_URL = "/api/payroll-regulations";

const EMPTY_REGULATION: NewPayrollRegulationPackage = {
  code: "",
  name: "",
  regulator: "",
  regulation_number: null,
  version: "",
  effective_from: "",
  effective_to: null,
  source_url: null,
  notes: null,
};

const statusSeverity = (
  status: PayrollRegulationStatus,
): "secondary" | "info" | "warning" | "success" | "danger" => {
  const values: Record<
    PayrollRegulationStatus,
    "secondary" | "info" | "warning" | "success" | "danger"
  > = {
    DRAFT: "secondary",
    TESTED: "info",
    APPROVED: "warning",
    PUBLISHED: "success",
    RETIRED: "danger",
  };
  return values[status];
};

const nextStatus = (
  status: PayrollRegulationStatus,
): Exclude<PayrollRegulationStatus, "DRAFT"> | null => {
  const transitions: Partial<
    Record<PayrollRegulationStatus, Exclude<PayrollRegulationStatus, "DRAFT">>
  > = {
    DRAFT: "TESTED",
    TESTED: "APPROVED",
    APPROVED: "PUBLISHED",
    PUBLISHED: "RETIRED",
  };
  return transitions[status] ?? null;
};

const optional = (value: string): string | null => value.trim() || null;

export default function PayrollConfiguration() {
  const dispatch = useDispatch();
  const {
    data: settings,
    error: settingError,
    isLoading: settingLoading,
    isValidating: settingValidating,
    mutate: refreshSettings,
  } = useSWR<PayrollSetting[]>(SETTING_URL, fetcher);
  const {
    data: regulations,
    error: regulationError,
    isLoading: regulationLoading,
    isValidating: regulationValidating,
    mutate: refreshRegulations,
  } = useSWR<PayrollRegulationPackage[]>(REGULATION_URL, fetcher);

  const [setting, setSetting] = useState<PayrollSetting | null>(null);
  const [savingSetting, setSavingSetting] = useState(false);
  const [showRegulationDialog, setShowRegulationDialog] = useState(false);
  const [savingRegulation, setSavingRegulation] = useState(false);
  const [transitioningId, setTransitioningId] = useState<number | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testRun, setTestRun] = useState<PayrollRegulationTestRun | null>(null);
  const [selectedRegulation, setSelectedRegulation] =
    useState<PayrollRegulationPackage | null>(null);
  const [regulation, setRegulation] =
    useState<NewPayrollRegulationPackage>(EMPTY_REGULATION);

  useEffect(() => {
    if (settings?.[0]) setSetting(settings[0]);
  }, [settings]);

  const toast = (
    severity: "success" | "error",
    summary: string,
    detail: string,
  ) => dispatch(showToast({ visible: true, severity, summary, detail }));

  const showError = (error: unknown) => {
    const detail =
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof (error as ResponseTypeError).message === "string"
        ? (error as ResponseTypeError).message
        : "An unexpected error occurred.";
    toast("error", "Error", detail);
  };

  const changeSetting = <K extends keyof PayrollSetting>(
    key: K,
    value: PayrollSetting[K],
  ) =>
    setSetting((current) => (current ? { ...current, [key]: value } : current));

  const saveSetting = async () => {
    if (!setting) return;
    const payload: UpdatePayrollSetting = {
      name: setting.name,
      currency_code: setting.currency_code,
      frequency_code: setting.frequency_code,
      default_proration_method: setting.default_proration_method,
      attendance_cutoff_day: setting.attendance_cutoff_day,
      payment_day: setting.payment_day,
      rounding_mode: setting.rounding_mode,
      decimal_scale: setting.decimal_scale,
      require_maker_checker: setting.require_maker_checker,
      allow_negative_net_pay: setting.allow_negative_net_pay,
      is_active: setting.is_active,
    };
    try {
      setSavingSetting(true);
      await updatePayrollSetting(setting.id, setting.row_version, payload);
      await refreshSettings();
      toast("success", "Success", "Payroll settings saved.");
    } catch (error: unknown) {
      showError(error);
    } finally {
      setSavingSetting(false);
    }
  };

  const createRegulation = async () => {
    if (
      !regulation.code.trim() ||
      !regulation.name.trim() ||
      !regulation.regulator.trim() ||
      !regulation.version.trim() ||
      !regulation.effective_from
    ) {
      toast("error", "Validation", "Complete all required regulation fields.");
      return;
    }
    try {
      setSavingRegulation(true);
      await createPayrollRegulation({
        ...regulation,
        regulation_number: optional(regulation.regulation_number ?? ""),
        effective_to: optional(regulation.effective_to ?? ""),
        source_url: optional(regulation.source_url ?? ""),
        notes: optional(regulation.notes ?? ""),
      });
      await refreshRegulations();
      setRegulation(EMPTY_REGULATION);
      setShowRegulationDialog(false);
      toast("success", "Success", "Regulation package created as draft.");
    } catch (error: unknown) {
      showError(error);
    } finally {
      setSavingRegulation(false);
    }
  };

  const transition = async (row: PayrollRegulationPackage) => {
    const target = nextStatus(row.status);
    if (!target) return;
    try {
      setTransitioningId(row.id);
      await transitionPayrollRegulation(row.id, row.row_version, target);
      await refreshRegulations();
      toast("success", "Success", `Regulation moved to ${target}.`);
    } catch (error: unknown) {
      showError(error);
    } finally {
      setTransitioningId(null);
    }
  };

  const runTests = async (row: PayrollRegulationPackage) => {
    try {
      setTestingId(row.id);
      const result = await runPayrollRegulationTests(row.id);
      setTestRun(result);
      toast(
        result.status === "PASSED" ? "success" : "error",
        result.status === "PASSED" ? "Tests passed" : "Tests need attention",
        `${result.passed_count} passed, ${result.failed_count} failed, ${result.error_count} errors.`,
      );
    } catch (error: unknown) {
      showError(error);
    } finally {
      setTestingId(null);
    }
  };

  if (settingLoading || regulationLoading) return <LoadingDataTable />;

  return (
    <Card className="border border-slate-200 shadow-sm">
      <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:flex">
              <i className="pi pi-wallet text-xl" />
            </div>
            <div>
              <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
                Payroll Configuration
              </h1>
              <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                Configure payroll behavior and effective-dated Indonesian
                regulations.
              </p>
            </div>
          </div>
        </div>

        <TabView>
          <TabPanel header="General Settings" leftIcon="pi pi-cog mr-2">
            {settingError ? (
              <ErrorNotConnectedToApi mutateKey={SETTING_URL} />
            ) : setting ? (
              <div className="flex flex-col gap-5 pt-3">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Field label="Setting Name">
                    <InputText
                      value={setting.name}
                      onChange={(event) =>
                        changeSetting("name", event.target.value)
                      }
                      className="w-full"
                    />
                  </Field>
                  <Field label="Currency">
                    <InputText
                      value={setting.currency_code}
                      disabled
                      className="w-full"
                    />
                  </Field>
                  <Field label="Payroll Frequency">
                    <Dropdown
                      value={setting.frequency_code}
                      options={["MONTHLY", "WEEKLY", "DAILY"]}
                      onChange={(event) =>
                        changeSetting("frequency_code", String(event.value))
                      }
                      className="w-full"
                    />
                  </Field>
                  <Field label="Proration Method">
                    <Dropdown
                      value={setting.default_proration_method}
                      options={[
                        "CALENDAR_DAYS",
                        "WORKING_DAYS",
                        "FIXED_30_DAYS",
                      ]}
                      onChange={(event) =>
                        changeSetting(
                          "default_proration_method",
                          String(event.value),
                        )
                      }
                      className="w-full"
                    />
                  </Field>
                  <Field label="Attendance Cutoff Day">
                    <InputNumber
                      value={setting.attendance_cutoff_day}
                      min={1}
                      max={31}
                      useGrouping={false}
                      onValueChange={(event) =>
                        changeSetting(
                          "attendance_cutoff_day",
                          event.value ?? null,
                        )
                      }
                      className="w-full"
                    />
                  </Field>
                  <Field label="Payment Day">
                    <InputNumber
                      value={setting.payment_day}
                      min={1}
                      max={31}
                      useGrouping={false}
                      onValueChange={(event) =>
                        changeSetting("payment_day", event.value ?? null)
                      }
                      className="w-full"
                    />
                  </Field>
                  <Field label="Rounding Mode">
                    <Dropdown
                      value={setting.rounding_mode}
                      options={["HALF_UP", "HALF_EVEN", "DOWN", "UP"]}
                      onChange={(event) =>
                        changeSetting("rounding_mode", String(event.value))
                      }
                      className="w-full"
                    />
                  </Field>
                  <Field label="Decimal Scale">
                    <InputNumber
                      value={setting.decimal_scale}
                      min={0}
                      max={4}
                      useGrouping={false}
                      onValueChange={(event) =>
                        changeSetting("decimal_scale", event.value ?? 0)
                      }
                      className="w-full"
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-5 md:grid-cols-3">
                  <SwitchField
                    label="Require maker-checker"
                    checked={setting.require_maker_checker}
                    onChange={(value) =>
                      changeSetting("require_maker_checker", value)
                    }
                  />
                  <SwitchField
                    label="Allow negative net pay"
                    checked={setting.allow_negative_net_pay}
                    onChange={(value) =>
                      changeSetting("allow_negative_net_pay", value)
                    }
                  />
                  <SwitchField
                    label="Active"
                    checked={setting.is_active}
                    onChange={(value) => changeSetting("is_active", value)}
                  />
                </div>
                <div className="flex justify-end border-t border-slate-200 pt-4">
                  <Button
                    label="Save Changes"
                    icon="pi pi-check"
                    loading={savingSetting}
                    disabled={savingSetting}
                    onClick={saveSetting}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No payroll setting is configured.
              </p>
            )}
          </TabPanel>

          <TabPanel header="Regulatory Packages" leftIcon="pi pi-book mr-2">
            {regulationError ? (
              <ErrorNotConnectedToApi mutateKey={REGULATION_URL} />
            ) : (
              <div className="flex flex-col gap-4 pt-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    label="Refresh"
                    icon="pi pi-refresh"
                    severity="secondary"
                    outlined
                    size="small"
                    loading={regulationValidating}
                    onClick={() => void refreshRegulations()}
                  />
                  <Button
                    label="New Regulation"
                    icon="pi pi-plus"
                    size="small"
                    onClick={() => setShowRegulationDialog(true)}
                  />
                </div>
                <DataTable
                  value={regulations ?? []}
                  dataKey="id"
                  paginator
                  rows={10}
                  stripedRows
                  rowHover
                  scrollable
                  responsiveLayout="scroll"
                  size="small"
                  tableStyle={{ minWidth: "68rem" }}
                  emptyMessage="No regulatory package found."
                >
                  <Column
                    field="code"
                    header="Code"
                    sortable
                    body={(row: PayrollRegulationPackage) => (
                      <span className="font-mono font-semibold">
                        {row.code}
                      </span>
                    )}
                  />
                  <Column field="name" header="Name" sortable />
                  <Column field="regulator" header="Regulator" sortable />
                  <Column field="version" header="Version" sortable />
                  <Column
                    field="effective_from"
                    header="Effective From"
                    sortable
                  />
                  <Column
                    field="status"
                    header="Status"
                    body={(row: PayrollRegulationPackage) => (
                      <Tag
                        value={row.status}
                        severity={statusSeverity(row.status)}
                      />
                    )}
                  />
                  <Column
                    header="Action"
                    frozen
                    alignFrozen="right"
                    body={(row: PayrollRegulationPackage) => {
                      const target = nextStatus(row.status);
                      return (
                        <div className="flex justify-end gap-2">
                          <Button
                            icon="pi pi-sliders-h"
                            tooltip="Configure details"
                            size="small"
                            severity="secondary"
                            outlined
                            aria-label="Configure regulation details"
                            onClick={() => setSelectedRegulation(row)}
                          />
                          {row.status === "DRAFT" && (
                            <Button
                              label="Run Tests"
                              icon="pi pi-play"
                              size="small"
                              severity="secondary"
                              outlined
                              loading={testingId === row.id}
                              disabled={
                                testingId !== null || transitioningId !== null
                              }
                              onClick={() => void runTests(row)}
                            />
                          )}
                          {target ? (
                            <Button
                              label={
                                target === "TESTED"
                                  ? "Mark Tested"
                                  : target === "APPROVED"
                                    ? "Approve"
                                    : target === "PUBLISHED"
                                      ? "Publish"
                                      : "Retire"
                              }
                              icon="pi pi-arrow-right"
                              size="small"
                              outlined
                              loading={transitioningId === row.id}
                              disabled={
                                transitioningId !== null || testingId !== null
                              }
                              onClick={() => void transition(row)}
                            />
                          ) : (
                            <span className="self-center text-sm text-slate-400">
                              Final
                            </span>
                          )}
                        </div>
                      );
                    }}
                  />
                </DataTable>
              </div>
            )}
          </TabPanel>
          <TabPanel header="Component Mapping" leftIcon="pi pi-sitemap mr-2">
            <PayrollComponentMappingPanel
              onSuccess={(message) => toast("success", "Success", message)}
              onError={showError}
            />
          </TabPanel>
        </TabView>
      </div>

      <Dialog
        header="New Regulatory Package"
        visible={showRegulationDialog}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "44rem" }}
        onHide={() => setShowRegulationDialog(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Cancel"
              severity="secondary"
              text
              disabled={savingRegulation}
              onClick={() => setShowRegulationDialog(false)}
            />
            <Button
              label="Create Draft"
              icon="pi pi-check"
              loading={savingRegulation}
              onClick={() => void createRegulation()}
            />
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
          <Field label="Code *">
            <InputText
              value={regulation.code}
              onChange={(event) =>
                setRegulation((current) => ({
                  ...current,
                  code: event.target.value,
                }))
              }
              className="w-full"
            />
          </Field>
          <Field label="Version *">
            <InputText
              value={regulation.version}
              onChange={(event) =>
                setRegulation((current) => ({
                  ...current,
                  version: event.target.value,
                }))
              }
              className="w-full"
            />
          </Field>
          <Field label="Name *">
            <InputText
              value={regulation.name}
              onChange={(event) =>
                setRegulation((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              className="w-full"
            />
          </Field>
          <Field label="Regulator *">
            <InputText
              value={regulation.regulator}
              onChange={(event) =>
                setRegulation((current) => ({
                  ...current,
                  regulator: event.target.value,
                }))
              }
              className="w-full"
            />
          </Field>
          <Field label="Regulation Number">
            <InputText
              value={regulation.regulation_number ?? ""}
              onChange={(event) =>
                setRegulation((current) => ({
                  ...current,
                  regulation_number: event.target.value,
                }))
              }
              className="w-full"
            />
          </Field>
          <Field label="Source URL">
            <InputText
              value={regulation.source_url ?? ""}
              onChange={(event) =>
                setRegulation((current) => ({
                  ...current,
                  source_url: event.target.value,
                }))
              }
              className="w-full"
            />
          </Field>
          <Field label="Effective From *">
            <InputText
              type="date"
              value={regulation.effective_from}
              onChange={(event) =>
                setRegulation((current) => ({
                  ...current,
                  effective_from: event.target.value,
                }))
              }
              className="w-full"
            />
          </Field>
          <Field label="Effective To">
            <InputText
              type="date"
              value={regulation.effective_to ?? ""}
              onChange={(event) =>
                setRegulation((current) => ({
                  ...current,
                  effective_to: event.target.value,
                }))
              }
              className="w-full"
            />
          </Field>
        </div>
      </Dialog>
      <PayrollRegulationDetailDialog
        regulation={selectedRegulation}
        onHide={() => setSelectedRegulation(null)}
        onSuccess={(message) => {
          toast("success", "Success", message);
          void refreshRegulations();
        }}
        onError={showError}
      />
      <PayrollRegulationTestRunDialog
        testRun={testRun}
        onHide={() => setTestRun(null)}
      />
      <ConfirmDialog />
    </Card>
  );
}

function PayrollRegulationTestRunDialog({
  testRun,
  onHide,
}: {
  testRun: PayrollRegulationTestRun | null;
  onHide: () => void;
}) {
  return (
    <Dialog
      header="Regulation Test Results"
      visible={testRun !== null}
      modal
      draggable={false}
      resizable={false}
      style={{ width: "96vw", maxWidth: "68rem" }}
      onHide={onHide}
      footer={
        <div className="flex justify-end">
          <Button
            label="Close"
            severity="secondary"
            outlined
            onClick={onHide}
          />
        </div>
      }
    >
      {testRun && (
        <div className="flex flex-col gap-4 pt-2">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <Tag
              value={testRun.status}
              severity={testRun.status === "PASSED" ? "success" : "danger"}
            />
            <span>{testRun.total_count} test cases</span>
            <span className="text-emerald-700">
              {testRun.passed_count} passed
            </span>
            <span className="text-rose-700">{testRun.failed_count} failed</span>
            <span className="text-amber-700">{testRun.error_count} errors</span>
            <span className="text-slate-500">
              Configuration revision {testRun.configuration_revision}
            </span>
          </div>
          <DataTable
            value={testRun.results}
            dataKey="test_case_id"
            size="small"
            stripedRows
            scrollable
            responsiveLayout="scroll"
            tableStyle={{ minWidth: "58rem" }}
          >
            <Column field="code" header="Code" />
            <Column field="name" header="Test Case" />
            <Column
              header="Status"
              body={(row: PayrollRegulationTestCaseResult) => (
                <Tag
                  value={row.status}
                  severity={row.status === "PASSED" ? "success" : "danger"}
                />
              )}
            />
            <Column
              header="Expected"
              body={(row: PayrollRegulationTestCaseResult) => (
                <JsonValue value={row.expected_output_json} />
              )}
            />
            <Column
              header="Actual"
              body={(row: PayrollRegulationTestCaseResult) => (
                <JsonValue value={row.actual_output_json} />
              )}
            />
            <Column field="tolerance" header="Tolerance" />
            <Column
              header="Details"
              body={(row: PayrollRegulationTestCaseResult) =>
                row.error_message ? (
                  <span className="text-sm text-rose-700">
                    {row.error_message}
                  </span>
                ) : (
                  <span className="text-sm text-slate-400">—</span>
                )
              }
            />
          </DataTable>
        </div>
      )}
    </Dialog>
  );
}

function JsonValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-sm text-slate-400">—</span>;
  }
  return (
    <code className="block max-w-56 whitespace-pre-wrap break-words text-xs text-slate-700">
      {JSON.stringify(value)}
    </code>
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
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function SwitchField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <InputSwitch
        checked={checked}
        onChange={(event) => onChange(Boolean(event.value))}
      />
    </div>
  );
}
