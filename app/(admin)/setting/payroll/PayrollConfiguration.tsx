"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
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
  createPayrollSetting,
  createPayrollPeriodRule,
  createPayrollRegulation,
  deletePayrollPeriodRule,
  runPayrollRegulationTests,
  transitionPayrollRegulation,
  updatePayrollPeriodRule,
  updatePayrollSetting,
} from "@/app/services/payroll-configuration-service";
import { getBranchOptions } from "@/app/services/employee-general-service";
import type {
  NewPayrollPeriodRule,
  NewPayrollRegulationPackage,
  NewPayrollSetting,
  PayrollRegulationPackage,
  PayrollRegulationStatus,
  PayrollRegulationTestCaseResult,
  PayrollRegulationTestRun,
  PayrollSetting,
  PayrollPeriodRule,
  UpdatePayrollSetting,
} from "@/app/types/payroll-configuration";
import { fetcher } from "@/app/utils/fetcher";
import { getErrorMessage } from "@/app/utils/error-messages";
import type { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";
import PayrollRegulationDetailDialog from "./PayrollRegulationDetailDialog";
import PayrollComponentMappingPanel from "./PayrollComponentMappingPanel";
import type { Frequency } from "@/app/types/frequency";
import type { PayrollProrationMethod } from "@/app/types/payroll-proration-method";
import PrimeDatePicker from "@/app/_components/PrimeDatePicker";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";

const SETTING_URL = "/api/payroll-settings";
const REGULATION_URL = "/api/payroll-regulations";
const PRORATION_METHOD_URL = "/api/payroll-proration-methods?is_active=true";

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

const EMPTY_PERIOD_RULE: NewPayrollPeriodRule = {
  cutoff_day: 15,
  effective_month: "",
  notes: null,
};

const emptyPayrollSetting = (): NewPayrollSetting => ({
  branch_id: null,
  name: "",
  currency_code: "IDR",
  frequency_code: "MONTHLY",
  default_proration_method: "SCHEDULED_DAYS",
  attendance_cutoff_day: null,
  payment_day: null,
  rounding_mode: "HALF_UP",
  decimal_scale: 0,
  require_maker_checker: true,
  allow_negative_net_pay: false,
  is_active: true,
});

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

const prorationBasisLabel = (method: PayrollProrationMethod) => {
  if (method.basis_code === "SCHEDULED_DAYS") return "Scheduled working days";
  if (method.basis_code === "CALENDAR_DAYS") return "Calendar days";
  if (method.basis_code === "FIXED_DIVISOR") {
    return `Fixed divisor${method.fixed_divisor_days ? ` (${method.fixed_divisor_days} days)` : ""}`;
  }
  return "No proration";
};

export default function PayrollConfiguration() {
  const dispatch = useDispatch();
  const permissions = useSelector(
    (state: RootState) => state.profile.permissions,
  );
  const canManage = permissions.includes("payroll-config.manage");
  const [setting, setSetting] = useState<PayrollSetting | null>(null);
  const {
    data: settings,
    error: settingError,
    isLoading: settingLoading,
    mutate: refreshSettings,
  } = useSWR<PayrollSetting[]>(SETTING_URL, fetcher);
  const { data: branches = [] } = useSWR(
    "payroll-configuration-branches",
    getBranchOptions,
  );
  const {
    data: regulations,
    error: regulationError,
    isLoading: regulationLoading,
    isValidating: regulationValidating,
    mutate: refreshRegulations,
  } = useSWR<PayrollRegulationPackage[]>(REGULATION_URL, fetcher);
  const { data: frequencies } = useSWR<Frequency[]>("/api/frequency", fetcher);
  const {
    data: prorationMethods,
    error: prorationMethodError,
    isLoading: prorationMethodLoading,
  } = useSWR<PayrollProrationMethod[]>(PRORATION_METHOD_URL, fetcher);
  const {
    data: periodRules,
    error: periodRuleError,
    isLoading: periodRuleLoading,
    isValidating: periodRuleValidating,
    mutate: refreshPeriodRules,
  } = useSWR<PayrollPeriodRule[]>(
    setting ? `${SETTING_URL}/${setting.id}/period-rules` : null,
    fetcher,
  );

  const [savingSetting, setSavingSetting] = useState(false);
  const [showSettingDialog, setShowSettingDialog] = useState(false);
  const [savingNewSetting, setSavingNewSetting] = useState(false);
  const [newSetting, setNewSetting] =
    useState<NewPayrollSetting>(emptyPayrollSetting);
  const [showRegulationDialog, setShowRegulationDialog] = useState(false);
  const [savingRegulation, setSavingRegulation] = useState(false);
  const [transitioningId, setTransitioningId] = useState<number | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testRun, setTestRun] = useState<PayrollRegulationTestRun | null>(null);
  const [selectedRegulation, setSelectedRegulation] =
    useState<PayrollRegulationPackage | null>(null);
  const [regulation, setRegulation] =
    useState<NewPayrollRegulationPackage>(EMPTY_REGULATION);
  const [showPeriodRuleDialog, setShowPeriodRuleDialog] = useState(false);
  const [savingPeriodRule, setSavingPeriodRule] = useState(false);
  const [deletingPeriodRuleId, setDeletingPeriodRuleId] = useState<
    number | null
  >(null);
  const [editingPeriodRule, setEditingPeriodRule] =
    useState<PayrollPeriodRule | null>(null);
  const [periodRule, setPeriodRule] =
    useState<NewPayrollPeriodRule>(EMPTY_PERIOD_RULE);
  const periodRuleNotificationKey = useRef<string | null>(null);

  useEffect(() => {
    setSetting((current) => {
      if (!settings?.length) return null;
      return settings.find((item) => item.id === current?.id) ?? settings[0];
    });
  }, [settings]);

  const branchNames = useMemo(
    () => new Map(branches.map((branch) => [Number(branch.id), branch.name])),
    [branches],
  );
  const branchOptions = useMemo(
    () =>
      branches.map((branch) => ({
        label: branch.name,
        value: Number(branch.id),
      })),
    [branches],
  );
  const settingOptions = useMemo(
    () =>
      (settings ?? []).map((item) => ({
        label: `${item.name} · ${
          item.branch_id === null
            ? "Global"
            : (branchNames.get(item.branch_id) ?? `Branch ${item.branch_id}`)
        }${item.is_active ? "" : " · Inactive"}`,
        value: item.id,
      })),
    [branchNames, settings],
  );
  const selectedProrationMethod = useMemo(
    () =>
      (prorationMethods ?? []).find(
        (method) => method.code === setting?.default_proration_method,
      ),
    [prorationMethods, setting?.default_proration_method],
  );

  const toast = (
    severity: "success" | "error",
    summary: string,
    detail: string,
  ) => dispatch(showToast({ visible: true, severity, summary, detail }));

  const showError = (error: unknown) => {
    toast("error", "Error", getErrorMessage(error));
  };

  useEffect(() => {
    if (!setting) {
      periodRuleNotificationKey.current = null;
      return;
    }
    if (periodRuleError) {
      const key = `error:${setting.id}`;
      if (periodRuleNotificationKey.current !== key) {
        periodRuleNotificationKey.current = key;
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Payroll setup",
            detail: getErrorMessage(periodRuleError),
          }),
        );
      }
      return;
    }
    if (periodRuleLoading || !periodRules) return;
    if (periodRules.length === 0) {
      const key = `empty:${setting.id}`;
      if (periodRuleNotificationKey.current !== key) {
        periodRuleNotificationKey.current = key;
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Payroll setup",
            detail:
              "No payroll period rule is configured for this setting. Add an effective rule below before running payroll.",
          }),
        );
      }
      return;
    }
    periodRuleNotificationKey.current = null;
  }, [dispatch, periodRuleError, periodRuleLoading, periodRules, setting]);

  const changeSetting = <K extends keyof PayrollSetting>(
    key: K,
    value: PayrollSetting[K],
  ) =>
    setSetting((current) => (current ? { ...current, [key]: value } : current));

  const saveSetting = async () => {
    if (!setting || !canManage) return;
    if (
      !prorationMethods?.some(
        (method) => method.code === setting.default_proration_method,
      )
    ) {
      toast(
        "error",
        "Validation",
        "Select an active proration method from the Proration Method master.",
      );
      return;
    }
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

  const openNewSetting = () => {
    setNewSetting(emptyPayrollSetting());
    setShowSettingDialog(true);
  };

  const createSetting = async () => {
    if (!newSetting.name.trim() || !canManage) {
      toast("error", "Validation", "Setting name is required.");
      return;
    }
    if (
      !prorationMethods?.some(
        (method) => method.code === newSetting.default_proration_method,
      )
    ) {
      toast(
        "error",
        "Validation",
        "Select an active proration method from the Proration Method master.",
      );
      return;
    }
    try {
      setSavingNewSetting(true);
      const created = await createPayrollSetting({
        ...newSetting,
        name: newSetting.name.trim(),
      });
      await refreshSettings();
      setSetting(created);
      setShowSettingDialog(false);
      toast("success", "Success", "Payroll setting created.");
    } catch (error: unknown) {
      showError(error);
    } finally {
      setSavingNewSetting(false);
    }
  };

  const openPeriodRule = (rule?: PayrollPeriodRule) => {
    setEditingPeriodRule(rule ?? null);
    setPeriodRule(
      rule
        ? {
            cutoff_day: rule.cutoff_day,
            effective_month: rule.effective_month.slice(0, 7),
            notes: rule.notes,
          }
        : EMPTY_PERIOD_RULE,
    );
    setShowPeriodRuleDialog(true);
  };

  const savePeriodRule = async () => {
    if (
      !setting ||
      !periodRule.effective_month ||
      periodRule.cutoff_day < 1 ||
      periodRule.cutoff_day > 31
    ) {
      toast(
        "error",
        "Validation",
        "Choose an effective month and cutoff day from 1 to 31.",
      );
      return;
    }
    const effectiveMonth = `${periodRule.effective_month.slice(0, 7)}-01`;
    try {
      setSavingPeriodRule(true);
      const payload = {
        ...periodRule,
        effective_month: effectiveMonth,
        notes: optional(periodRule.notes ?? ""),
      };
      if (editingPeriodRule) {
        await updatePayrollPeriodRule(
          setting.id,
          editingPeriodRule.id,
          editingPeriodRule.row_version,
          payload,
        );
      } else {
        await createPayrollPeriodRule(setting.id, payload);
      }
      await refreshPeriodRules();
      setShowPeriodRuleDialog(false);
      toast("success", "Success", "Payroll period rule saved.");
    } catch (error: unknown) {
      showError(error);
    } finally {
      setSavingPeriodRule(false);
    }
  };

  const removePeriodRule = async (rule: PayrollPeriodRule) => {
    if (!setting) return;
    try {
      setDeletingPeriodRuleId(rule.id);
      await deletePayrollPeriodRule(setting.id, rule.id, rule.row_version);
      await refreshPeriodRules();
      toast("success", "Success", "Payroll period rule retired.");
    } catch (error: unknown) {
      showError(error);
    } finally {
      setDeletingPeriodRuleId(null);
    }
  };

  const confirmRemovePeriodRule = (rule: PayrollPeriodRule) => {
    requestActionConfirmation({
      action: "Retire payroll period rule",
      target: `Cutoff day ${rule.cutoff_day} · effective ${rule.effective_month}`,
      severity: "danger",
      confirmLabel: "Retire rule",
      confirmIcon: "pi pi-trash",
      description: "Retire this future cutoff rule?",
      onAccept: () => removePeriodRule(rule),
    });
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
  const confirmTransition = (row: PayrollRegulationPackage) => {
    const target = nextStatus(row.status);
    if (!target) return;
    const finalAction = target === "PUBLISHED" || target === "RETIRED";
    requestActionConfirmation({
      action: `${target === "RETIRED" ? "Retire" : target === "PUBLISHED" ? "Publish" : target === "APPROVED" ? "Approve" : "Mark tested"} regulation`,
      target: `${row.code} · ${row.version}`,
      severity: finalAction ? "danger" : "warning",
      confirmLabel: target === "RETIRED" ? "Retire" : target,
      confirmIcon: target === "RETIRED" ? "pi pi-ban" : "pi pi-check",
      description:
        target === "RETIRED"
          ? "Retire this regulation package?"
          : target === "PUBLISHED"
            ? "Publish this regulation package?"
            : `Mark this regulation ${target.toLowerCase()}?`,
      onAccept: () => transition(row),
    });
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
  const confirmRunTests = (row: PayrollRegulationPackage) => {
    requestActionConfirmation({
      action: "Run regulation tests",
      target: `${row.code} · ${row.version}`,
      severity: "info",
      confirmLabel: "Run Tests",
      confirmIcon: "pi pi-play",
      description: "Run regulation tests for this package?",
      onAccept: () => runTests(row),
    });
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
                <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-end md:justify-between">
                  <div className="w-full md:max-w-xl">
                    <Field label="Payroll Setting">
                      <Dropdown
                        value={setting.id}
                        options={settingOptions}
                        optionLabel="label"
                        optionValue="value"
                        className="w-full"
                        onChange={(event) => {
                          const selected = (settings ?? []).find(
                            (item) => item.id === Number(event.value),
                          );
                          if (selected) setSetting(selected);
                        }}
                      />
                    </Field>
                  </div>
                  {canManage && (
                    <Button
                      label="New Payroll Setting"
                      icon="pi pi-plus"
                      size="small"
                      onClick={openNewSetting}
                    />
                  )}
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Field label="Setting Name">
                    <InputText
                      value={setting.name}
                      disabled={!canManage}
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
                      options={(frequencies ?? []).filter(
                        (frequency) =>
                          frequency.is_active && !frequency.deleted_at,
                      )}
                      optionLabel="name"
                      optionValue="code"
                      placeholder="Select payroll frequency"
                      disabled={!canManage}
                      onChange={(event) =>
                        changeSetting("frequency_code", String(event.value))
                      }
                      className="w-full"
                    />
                  </Field>
                  <Field label="Proration Method">
                    <div className="flex flex-col gap-2">
                      <Dropdown
                        value={setting.default_proration_method}
                        options={prorationMethods ?? []}
                        optionLabel="name"
                        optionValue="code"
                        itemTemplate={(method: PayrollProrationMethod) =>
                          method ? (
                            <div className="flex flex-col gap-1 py-1">
                              <span className="font-medium text-slate-800">
                                {method.name}
                              </span>
                              <span className="font-mono text-xs text-slate-500">
                                {method.code} · {prorationBasisLabel(method)}
                              </span>
                              <span className="text-xs leading-5 text-slate-500">
                                {method.description}
                              </span>
                            </div>
                          ) : null
                        }
                        placeholder={
                          prorationMethodLoading
                            ? "Loading proration methods..."
                            : "Select proration method"
                        }
                        disabled={
                          !canManage ||
                          prorationMethodLoading ||
                          !!prorationMethodError
                        }
                        onChange={(event) =>
                          changeSetting(
                            "default_proration_method",
                            String(event.value),
                          )
                        }
                        className="w-full"
                      />
                      {selectedProrationMethod ? (
                        <span className="text-xs leading-5 text-slate-500">
                          {selectedProrationMethod.description}
                        </span>
                      ) : prorationMethodError ? (
                        <span className="text-xs text-red-600">
                          Unable to load proration method master data.
                        </span>
                      ) : (
                        <span className="text-xs text-amber-700">
                          Choose a method from the Proration Method master.
                        </span>
                      )}
                    </div>
                  </Field>
                  <Field label="Attendance Cutoff">
                    <InputText
                      value={
                        periodRules?.[0]
                          ? `Configured by effective rules (latest: day ${periodRules[0].cutoff_day})`
                          : "Not configured — add an effective period rule below"
                      }
                      disabled
                      className="w-full"
                    />
                  </Field>
                  <Field label="Payment Day">
                    <InputNumber
                      value={setting.payment_day}
                      min={1}
                      max={31}
                      useGrouping={false}
                      disabled={!canManage}
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
                      disabled={!canManage}
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
                      disabled={!canManage}
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
                    disabled={!canManage}
                    onChange={(value) =>
                      changeSetting("require_maker_checker", value)
                    }
                  />
                  <SwitchField
                    label="Allow negative net pay"
                    checked={setting.allow_negative_net_pay}
                    disabled={!canManage}
                    onChange={(value) =>
                      changeSetting("allow_negative_net_pay", value)
                    }
                  />
                  <SwitchField
                    label="Active"
                    checked={setting.is_active}
                    disabled={!canManage}
                    onChange={(value) => changeSetting("is_active", value)}
                  />
                </div>
                {canManage && (
                  <div className="flex justify-end border-t border-slate-200 pt-4">
                    <Button
                      label="Save Changes"
                      icon="pi pi-check"
                      loading={savingSetting}
                      disabled={savingSetting}
                      onClick={saveSetting}
                    />
                  </div>
                )}
                <div className="flex flex-col gap-4 border-t border-slate-200 pt-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="m-0 text-base font-semibold text-slate-800">
                        Payroll Period Rules
                      </h2>
                      <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                        Effective-dated rules define the inclusive period. A
                        cutoff of 15 means the period runs from the 16th of the
                        previous month through the 15th.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        label="Refresh"
                        icon="pi pi-refresh"
                        severity="secondary"
                        outlined
                        size="small"
                        loading={periodRuleValidating}
                        onClick={() => void refreshPeriodRules()}
                      />
                      {canManage && (
                        <Button
                          label="Add Period Rule"
                          icon="pi pi-plus"
                          size="small"
                          disabled={
                            !setting.is_active ||
                            setting.frequency_code.toUpperCase() !== "MONTHLY"
                          }
                          onClick={() => openPeriodRule()}
                        />
                      )}
                    </div>
                  </div>
                  {periodRuleError ? (
                    <p className="m-0 text-sm text-red-600">
                      Unable to load payroll period rules.
                    </p>
                  ) : periodRuleLoading ? (
                    <p className="m-0 text-sm text-slate-500">
                      Loading period rules…
                    </p>
                  ) : (
                    <DataTable
                      value={periodRules ?? []}
                      dataKey="id"
                      stripedRows
                      rowHover
                      size="small"
                      emptyMessage="No payroll period rule configured."
                    >
                      <Column
                        header="Effective Month"
                        body={(row: PayrollPeriodRule) =>
                          row.effective_month.slice(0, 7)
                        }
                      />
                      <Column field="cutoff_day" header="Cutoff Day" />
                      <Column field="notes" header="Notes" />
                      {canManage && (
                        <Column
                          header="Action"
                          frozen
                          alignFrozen="right"
                          body={(row: PayrollPeriodRule) => (
                            <div className="flex justify-end gap-1">
                              <Button
                                icon="pi pi-pencil"
                                rounded
                                text
                                severity="secondary"
                                tooltip="Edit future rule"
                                onClick={() => openPeriodRule(row)}
                              />
                              <Button
                                icon="pi pi-trash"
                                rounded
                                text
                                severity="danger"
                                tooltip="Retire future rule"
                                loading={deletingPeriodRuleId === row.id}
                                disabled={deletingPeriodRuleId !== null}
                                onClick={() => confirmRemovePeriodRule(row)}
                              />
                            </div>
                          )}
                        />
                      )}
                    </DataTable>
                  )}
                  {setting.frequency_code.toUpperCase() !== "MONTHLY" && (
                    <p className="m-0 text-xs text-amber-700">
                      Automatic cutoff rules are available for monthly payroll
                      settings only.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3">
                <p className="m-0 text-sm text-slate-500">
                  No payroll setting is configured.
                </p>
                {canManage && (
                  <Button
                    label="New Payroll Setting"
                    icon="pi pi-plus"
                    size="small"
                    onClick={openNewSetting}
                  />
                )}
              </div>
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
                              onClick={() => confirmRunTests(row)}
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
                              onClick={() => confirmTransition(row)}
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
        header="New Payroll Setting"
        visible={showSettingDialog}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "34rem" }}
        onHide={() => setShowSettingDialog(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Cancel"
              severity="secondary"
              text
              disabled={savingNewSetting}
              onClick={() => setShowSettingDialog(false)}
            />
            <Button
              label="Create Setting"
              icon="pi pi-check"
              loading={savingNewSetting}
              onClick={() => void createSetting()}
            />
          </div>
        }
      >
        <div className="flex flex-col gap-4 pt-2">
          <Field label="Setting Name *">
            <InputText
              value={newSetting.name}
              autoFocus
              className="w-full"
              onChange={(event) =>
                setNewSetting((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Branch Scope">
            <Dropdown
              value={newSetting.branch_id}
              options={branchOptions}
              showClear
              filter
              placeholder="Global (all branches)"
              className="w-full"
              onChange={(event) =>
                setNewSetting((current) => ({
                  ...current,
                  branch_id: event.value ? Number(event.value) : null,
                }))
              }
            />
          </Field>
          <Field label="Proration Method *">
            <div className="flex flex-col gap-2">
              <Dropdown
                value={newSetting.default_proration_method}
                options={prorationMethods ?? []}
                optionLabel="name"
                optionValue="code"
                itemTemplate={(method: PayrollProrationMethod) =>
                  method ? (
                    <div className="flex flex-col gap-1 py-1">
                      <span className="font-medium text-slate-800">
                        {method.name}
                      </span>
                      <span className="font-mono text-xs text-slate-500">
                        {method.code} · {prorationBasisLabel(method)}
                      </span>
                      <span className="text-xs leading-5 text-slate-500">
                        {method.description}
                      </span>
                    </div>
                  ) : null
                }
                placeholder="Select proration method"
                disabled={prorationMethodLoading || !!prorationMethodError}
                onChange={(event) =>
                  setNewSetting((current) => ({
                    ...current,
                    default_proration_method: String(event.value),
                  }))
                }
                className="w-full"
              />
              {prorationMethods?.find(
                (method) => method.code === newSetting.default_proration_method,
              )?.description && (
                <span className="text-xs leading-5 text-slate-500">
                  {
                    prorationMethods.find(
                      (method) =>
                        method.code === newSetting.default_proration_method,
                    )?.description
                  }
                </span>
              )}
            </div>
          </Field>
          <p className="m-0 text-xs leading-5 text-slate-500">
            The setting uses the standard monthly payroll defaults. You can
            adjust the details after it is created.
          </p>
        </div>
      </Dialog>

      <Dialog
        header={
          editingPeriodRule
            ? "Edit Payroll Period Rule"
            : "Add Payroll Period Rule"
        }
        visible={showPeriodRuleDialog}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "34rem" }}
        onHide={() => setShowPeriodRuleDialog(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Cancel"
              severity="secondary"
              text
              disabled={savingPeriodRule}
              onClick={() => setShowPeriodRuleDialog(false)}
            />
            <Button
              label="Save Rule"
              icon="pi pi-check"
              loading={savingPeriodRule}
              onClick={() => void savePeriodRule()}
            />
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
          <Field label="Effective Month *">
            <InputText
              type="month"
              value={periodRule.effective_month.slice(0, 7)}
              className="w-full"
              onChange={(event) =>
                setPeriodRule((current) => ({
                  ...current,
                  effective_month: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Cutoff Day *">
            <InputNumber
              value={periodRule.cutoff_day}
              min={1}
              max={31}
              useGrouping={false}
              className="w-full"
              onValueChange={(event) =>
                setPeriodRule((current) => ({
                  ...current,
                  cutoff_day: event.value ?? 1,
                }))
              }
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <InputText
                value={periodRule.notes ?? ""}
                className="w-full"
                onChange={(event) =>
                  setPeriodRule((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </Field>
          </div>
        </div>
      </Dialog>

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
            <PrimeDatePicker
              value={regulation.effective_from}
              onValueChange={(value) =>
                setRegulation((current) => ({
                  ...current,
                  effective_from: value,
                }))
              }
              className="w-full"
            />
          </Field>
          <Field label="Effective To">
            <PrimeDatePicker
              value={regulation.effective_to}
              onValueChange={(value) =>
                setRegulation((current) => ({
                  ...current,
                  effective_to: value || null,
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
  disabled = false,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <InputSwitch
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(Boolean(event.value))}
      />
    </div>
  );
}
