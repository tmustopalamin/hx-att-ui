"use client";
import { useI18n } from "@/app/i18n";
import { formatStatusLabel } from "@/app/i18n/statusLabel";

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
import { isWhitespaceFreeIdentifier } from "@/app/utils/identifier-validation";
import type { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";
import PayrollRegulationDetailDialog from "./PayrollRegulationDetailDialog";
import PayrollRegulationVersionWizard from "./PayrollRegulationVersionWizard";
import PayrollComponentMappingPanel from "./PayrollComponentMappingPanel";
import type { PayrollProrationMethod } from "@/app/types/payroll-proration-method";
import PrimeDatePicker from "@/app/_components/PrimeDatePicker";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import { formatDate as formatDisplayDate } from "@/app/utils/date-format";

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
    return "Fixed divisor";
  }
  return "No proration";
};

const prorationMethodLabel = (method: PayrollProrationMethod) => {
  if (method.code === "SCHEDULED_DAYS" || method.code === "WORKING_DAYS") {
    return "Based on Scheduled Working Days";
  }
  if (method.code === "CALENDAR_DAYS") return "Based on Calendar Days";
  if (method.code === "FIXED_30_DAYS" || method.code === "FIXED_DIVISOR") {
    return "Fixed divisor";
  }
  if (method.code === "NONE") return "No Proration";
  return "Custom Proration Method";
};

const prorationMethodDescription = (method: PayrollProrationMethod) => {
  if (method.code === "SCHEDULED_DAYS" || method.code === "WORKING_DAYS") {
    return "Menghitung gaji pokok bulanan berdasarkan jadwal kerja karyawan dalam satu periode penggajian. Hari di luar masa kerja, ketidakhadiran, dan cuti tidak dibayar mengurangi hari yang dibayar; cuti dibayar tetap dihitung.";
  }
  if (method.code === "CALENDAR_DAYS") {
    return "Menghitung gaji pokok berdasarkan seluruh hari kalender dalam periode penggajian. Hari di luar masa kerja, ketidakhadiran, dan cuti tidak dibayar mengurangi hari yang dibayar; cuti dibayar tetap dihitung.";
  }
  if (method.code === "FIXED_30_DAYS" || method.code === "FIXED_DIVISOR") {
    return `Menggunakan pembagi tetap${method.fixed_divisor_days ? ` ${method.fixed_divisor_days} hari` : ""}. Setiap hari kalender yang tidak dibayar mengurangi gaji pokok secara proporsional.`;
  }
  if (method.code === "NONE") {
    return "Membayar gaji pokok bulanan penuh tanpa penyesuaian berdasarkan tanggal masuk, tanggal keluar, ketidakhadiran, atau cuti tidak dibayar.";
  }
  return "Metode khusus yang telah dikonfigurasi pada master penggajian.";
};

type LocalizedPayrollProrationMethod = PayrollProrationMethod & {
  localized_name: string;
  localized_description: string;
};

export default function PayrollConfiguration() {
  const { t: i18nT } = useI18n();
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
  const isLegacyNonMonthlySetting =
    setting !== null && setting.frequency_code.toUpperCase() !== "MONTHLY";
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
    setting && !isLegacyNonMonthlySetting
      ? `${SETTING_URL}/${setting.id}/period-rules`
      : null,
    fetcher,
  );

  const [savingSetting, setSavingSetting] = useState(false);
  const [showSettingDialog, setShowSettingDialog] = useState(false);
  const [savingNewSetting, setSavingNewSetting] = useState(false);
  const [newSetting, setNewSetting] =
    useState<NewPayrollSetting>(emptyPayrollSetting);
  const [showRegulationDialog, setShowRegulationDialog] = useState(false);
  const [showVersionWizard, setShowVersionWizard] = useState(false);
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

  useEffect(() => {
    if (!selectedRegulation || !regulations) return;
    const refreshed = regulations.find(
      (item) => item.id === selectedRegulation.id,
    );
    if (refreshed && refreshed.row_version !== selectedRegulation.row_version) {
      setSelectedRegulation(refreshed);
    }
  }, [regulations, selectedRegulation]);

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
        label: i18nT("static.1uuktlc", {
          p0: item.name,
          p1:
            item.branch_id === null
              ? i18nT("static.rrldxq")
              : (branchNames.get(item.branch_id) ??
                i18nT("static.9imgeb", { p0: item.branch_id })),
          p2: item.is_active ? "" : i18nT("static.l8g9rw"),
        }),
        value: item.id,
      })),
    [branchNames, i18nT, settings],
  );
  const prorationMethodOptions = useMemo<LocalizedPayrollProrationMethod[]>(
    () =>
      (prorationMethods ?? []).map((method) => ({
        ...method,
        localized_name: `${i18nT(prorationMethodLabel(method))}${
          method.fixed_divisor_days
            ? ` ${method.fixed_divisor_days} ${i18nT("days")}`
            : ""
        }`,
        localized_description: i18nT(prorationMethodDescription(method)),
      })),
    [i18nT, prorationMethods],
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
    toast("error", i18nT("static.1vks92p"), getErrorMessage(error));
  };

  useEffect(() => {
    if (!setting) {
      periodRuleNotificationKey.current = null;
      return;
    }
    if (isLegacyNonMonthlySetting) {
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
            summary: i18nT("static.1laurpn"),
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
            summary: i18nT("static.1laurpn"),
            detail: i18nT("static.1d4apq0"),
          }),
        );
      }
      return;
    }
    periodRuleNotificationKey.current = null;
  }, [
    dispatch,
    isLegacyNonMonthlySetting,
    periodRuleError,
    periodRuleLoading,
    periodRules,
    i18nT,
    setting,
  ]);

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
      toast("error", i18nT("static.gy1qqi"), i18nT("static.bwwp2u"));
      return;
    }
    const payload: UpdatePayrollSetting = {
      name: setting.name,
      currency_code: setting.currency_code,
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
      toast("success", i18nT("static.udvru8"), i18nT("static.153ro4a"));
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
      toast("error", i18nT("static.gy1qqi"), i18nT("static.k0y8g3"));
      return;
    }
    if (
      !prorationMethods?.some(
        (method) => method.code === newSetting.default_proration_method,
      )
    ) {
      toast("error", i18nT("static.gy1qqi"), i18nT("static.bwwp2u"));
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
      toast("success", i18nT("static.udvru8"), i18nT("static.1nzpdrw"));
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
      toast("error", i18nT("static.gy1qqi"), i18nT("static.1jvac4y"));
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
      toast("success", i18nT("static.udvru8"), i18nT("static.16z2e8i"));
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
      toast("success", i18nT("static.udvru8"), i18nT("static.1k3fjck"));
    } catch (error: unknown) {
      showError(error);
    } finally {
      setDeletingPeriodRuleId(null);
    }
  };

  const confirmRemovePeriodRule = (rule: PayrollPeriodRule) => {
    requestActionConfirmation({
      action: i18nT("static.1nzxg6a"),
      target: `Cutoff day ${rule.cutoff_day} · effective ${rule.effective_month}`,
      severity: "danger",
      confirmLabel: i18nT("static.13g4z6s"),
      confirmIcon: "pi pi-trash",
      description: i18nT("static.1fnvzel"),
      onAccept: () => removePeriodRule(rule),
    });
  };

  const createRegulation = async () => {
    if (!isWhitespaceFreeIdentifier(regulation.code)) {
      toast(
        "error",
        i18nT("static.gy1qqi"),
        i18nT("validation.codeNoWhitespace"),
      );
      return;
    }
    if (
      !regulation.code.trim() ||
      !regulation.name.trim() ||
      !regulation.regulator.trim() ||
      !regulation.version.trim() ||
      !regulation.effective_from
    ) {
      toast("error", i18nT("static.gy1qqi"), i18nT("static.f2kucb"));
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
      toast("success", i18nT("static.udvru8"), i18nT("static.1or1j4y"));
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
      toast(
        "success",
        i18nT("static.udvru8"),
        i18nT("static.1v7wvgt", { p0: target }),
      );
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
      action: i18nT("static.1c6rii3", {
        p0:
          target === "RETIRED"
            ? i18nT("static.rgquxi")
            : target === "PUBLISHED"
              ? i18nT("static.u2m17s")
              : target === "APPROVED"
                ? i18nT("static.1s2ov2y")
                : i18nT("static.5q3lzp"),
      }),
      target: `${row.code} · ${row.version}`,
      severity: finalAction ? "danger" : "warning",
      confirmLabel: target === "RETIRED" ? i18nT("static.rgquxi") : target,
      confirmIcon: target === "RETIRED" ? "pi pi-ban" : "pi pi-check",
      description:
        target === "RETIRED"
          ? i18nT("static.gf1yzz")
          : target === "PUBLISHED"
            ? i18nT("static.3lev5")
            : i18nT("static.at2w39", { p0: target.toLowerCase() }),
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
        result.status === "PASSED"
          ? i18nT("static.pyxkuu")
          : i18nT("static.1yu5hfk"),
        i18nT("static.1of3d7a", {
          p0: result.passed_count,
          p1: result.failed_count,
          p2: result.error_count,
        }),
      );
    } catch (error: unknown) {
      showError(error);
    } finally {
      setTestingId(null);
    }
  };
  const confirmRunTests = (row: PayrollRegulationPackage) => {
    requestActionConfirmation({
      action: i18nT("static.xq6ksb"),
      target: `${row.code} · ${row.version}`,
      severity: "info",
      confirmLabel: i18nT("static.1kf2t4f"),
      confirmIcon: "pi pi-play",
      description: i18nT("static.ed5x5h"),
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
                {i18nT("static.n0b678")}{" "}
              </h1>
              <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                {i18nT("static.5oudfg")}{" "}
              </p>
            </div>
          </div>
        </div>

        <TabView>
          <TabPanel header={i18nT("static.5zlfh8")} leftIcon="pi pi-cog mr-2">
            {settingError ? (
              <ErrorNotConnectedToApi mutateKey={SETTING_URL} />
            ) : setting ? (
              <div className="flex flex-col gap-5 pt-3">
                <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-end md:justify-between">
                  <div className="w-full md:max-w-xl">
                    <Field
                      label={i18nT("static.1aar9d6")}
                      hint={i18nT("static.1vq9shn")}
                    >
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
                      label={i18nT("static.m8xp8g")}
                      icon="pi pi-plus"
                      size="small"
                      onClick={openNewSetting}
                    />
                  )}
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Field
                    label={i18nT("static.gs3w22")}
                    hint={i18nT("static.e8x4c0")}
                  >
                    <InputText
                      value={setting.name}
                      disabled={!canManage}
                      onChange={(event) =>
                        changeSetting("name", event.target.value)
                      }
                      className="w-full"
                    />
                  </Field>
                  <Field
                    label={i18nT("static.5o3zh2")}
                    hint={i18nT("static.tccj4d")}
                  >
                    <InputText
                      value={setting.currency_code}
                      disabled
                      className="w-full"
                    />
                  </Field>
                  <Field
                    label={i18nT("static.cnnxc")}
                    hint={
                      isLegacyNonMonthlySetting
                        ? i18nT("static.w8qfp2")
                        : i18nT("static.1qpym0s")
                    }
                  >
                    <InputText
                      value={
                        isLegacyNonMonthlySetting
                          ? i18nT("static.85tx1b")
                          : i18nT("static.669v12")
                      }
                      disabled
                      className="w-full"
                    />
                  </Field>
                  <Field
                    label={i18nT("static.my8k20")}
                    hint={i18nT("static.jggg61")}
                  >
                    <div className="flex flex-col gap-2">
                      <Dropdown
                        value={setting.default_proration_method}
                        options={prorationMethodOptions}
                        optionLabel="localized_name"
                        optionValue="code"
                        itemTemplate={(
                          method: LocalizedPayrollProrationMethod,
                        ) =>
                          method ? (
                            <div className="flex flex-col gap-1 py-1">
                              <span className="font-medium text-slate-800">
                                {method.localized_name}
                              </span>
                              <span className="font-mono text-xs text-slate-500">
                                {i18nT("static.140ash2")}{" "}
                                {i18nT(prorationBasisLabel(method))}
                                {method.fixed_divisor_days
                                  ? ` (${method.fixed_divisor_days} ${i18nT("days")})`
                                  : ""}
                              </span>
                              <span className="text-xs leading-5 text-slate-500">
                                {method.localized_description}
                              </span>
                            </div>
                          ) : null
                        }
                        placeholder={
                          prorationMethodLoading
                            ? i18nT("static.q3i165")
                            : i18nT("static.1dsf42k")
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
                          {i18nT(
                            prorationMethodDescription(selectedProrationMethod),
                          )}
                        </span>
                      ) : prorationMethodError ? (
                        <span className="text-xs text-red-600">
                          {i18nT("static.g7icfh")}{" "}
                        </span>
                      ) : (
                        <span className="text-xs text-amber-700">
                          {i18nT("static.uawqxc")}{" "}
                        </span>
                      )}
                    </div>
                  </Field>
                  <Field
                    label={i18nT("static.mhfuqj")}
                    hint={i18nT("static.84tfnr")}
                  >
                    <InputText
                      value={
                        periodRules?.[0]
                          ? i18nT("static.10pgjki", {
                              p0: periodRules[0].cutoff_day,
                            })
                          : i18nT("static.26yjwk")
                      }
                      disabled
                      className="w-full"
                    />
                  </Field>
                  <Field
                    label={i18nT("static.21x3xr")}
                    hint={i18nT("static.1ncdzmb")}
                  >
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
                  <Field
                    label={i18nT("static.1blymlc")}
                    hint={i18nT("static.n9rzr1")}
                  >
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
                  <Field
                    label={i18nT("static.xc46da")}
                    hint={i18nT("static.1k1iy96")}
                  >
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
                    label={i18nT("static.67ibcm")}
                    hint={i18nT("static.1ahn0wy")}
                    checked={setting.require_maker_checker}
                    disabled={!canManage}
                    onChange={(value) =>
                      changeSetting("require_maker_checker", value)
                    }
                  />
                  <SwitchField
                    label={i18nT("static.159s58")}
                    hint={i18nT("static.8zqhke")}
                    checked={setting.allow_negative_net_pay}
                    disabled={!canManage}
                    onChange={(value) =>
                      changeSetting("allow_negative_net_pay", value)
                    }
                  />
                  <SwitchField
                    label={i18nT("static.8qzyhb")}
                    hint={i18nT("static.1wynqo")}
                    checked={setting.is_active}
                    disabled={!canManage}
                    onChange={(value) => changeSetting("is_active", value)}
                  />
                </div>
                {canManage && (
                  <div className="flex justify-end border-t border-slate-200 pt-4">
                    <Button
                      label={i18nT("static.6gmm1l")}
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
                        {i18nT("static.ol3s8w")}{" "}
                      </h2>
                      <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                        {i18nT("static.1h73f83")}{" "}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        label={i18nT("static.28r6qc")}
                        icon="pi pi-refresh"
                        severity="secondary"
                        outlined
                        size="small"
                        loading={periodRuleValidating}
                        onClick={() => void refreshPeriodRules()}
                      />
                      {canManage && (
                        <Button
                          label={i18nT("static.y7l235")}
                          icon="pi pi-plus"
                          size="small"
                          disabled={
                            !setting.is_active || isLegacyNonMonthlySetting
                          }
                          onClick={() => openPeriodRule()}
                        />
                      )}
                    </div>
                  </div>
                  {isLegacyNonMonthlySetting ? (
                    <p className="m-0 text-sm text-amber-700">
                      {i18nT("static.15sf3sh")}{" "}
                    </p>
                  ) : periodRuleError ? (
                    <p className="m-0 text-sm text-red-600">
                      {i18nT("static.jen1hs")}{" "}
                    </p>
                  ) : periodRuleLoading ? (
                    <p className="m-0 text-sm text-slate-500">
                      {i18nT("static.mgyfb3")}{" "}
                    </p>
                  ) : (
                    <DataTable
                      value={periodRules ?? []}
                      dataKey="id"
                      stripedRows
                      rowHover
                      size="small"
                      emptyMessage={i18nT("static.qreaus")}
                    >
                      <Column
                        header={i18nT("static.whugww")}
                        body={(row: PayrollPeriodRule) =>
                          row.effective_month.slice(0, 7)
                        }
                      />
                      <Column
                        field="cutoff_day"
                        header={i18nT("static.1c3dlf0")}
                      />
                      <Column field="notes" header={i18nT("static.4f76ga")} />
                      {canManage && (
                        <Column
                          header={i18nT("static.2wk0tb")}
                          frozen
                          alignFrozen="right"
                          body={(row: PayrollPeriodRule) => (
                            <div className="flex justify-end gap-1">
                              <Button
                                icon="pi pi-pencil"
                                rounded
                                text
                                severity="secondary"
                                tooltip={i18nT("static.mgsk3h")}
                                onClick={() => openPeriodRule(row)}
                              />
                              <Button
                                icon="pi pi-trash"
                                rounded
                                text
                                severity="danger"
                                tooltip={i18nT("static.31d3v6")}
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
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3">
                <p className="m-0 text-sm text-slate-500">
                  {i18nT("static.2me8tn")}{" "}
                </p>
                {canManage && (
                  <Button
                    label={i18nT("static.m8xp8g")}
                    icon="pi pi-plus"
                    size="small"
                    onClick={openNewSetting}
                  />
                )}
              </div>
            )}
          </TabPanel>

          <TabPanel header={i18nT("static.1s38tfg")} leftIcon="pi pi-book mr-2">
            {regulationError ? (
              <ErrorNotConnectedToApi mutateKey={REGULATION_URL} />
            ) : (
              <div className="flex flex-col gap-4 pt-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    label={i18nT("static.28r6qc")}
                    icon="pi pi-refresh"
                    severity="secondary"
                    outlined
                    size="small"
                    loading={regulationValidating}
                    onClick={() => void refreshRegulations()}
                  />
                  <Button
                    label={i18nT("static.1qhcwwo")}
                    icon="pi pi-copy"
                    size="small"
                    onClick={() => setShowVersionWizard(true)}
                  />
                  <Button
                    label={i18nT("static.qwfkor")}
                    icon="pi pi-sliders-h"
                    severity="secondary"
                    outlined
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
                  emptyMessage={i18nT("static.b2ktyy")}
                >
                  <Column
                    field="code"
                    header={i18nT("static.xoaiok")}
                    sortable
                    body={(row: PayrollRegulationPackage) => (
                      <span className="font-mono font-semibold">
                        {row.code}
                      </span>
                    )}
                  />
                  <Column
                    field="name"
                    header={i18nT("static.4el6o6")}
                    sortable
                  />
                  <Column
                    field="regulator"
                    header={i18nT("static.phhmg")}
                    sortable
                  />
                  <Column
                    field="version"
                    header={i18nT("static.q0zd4n")}
                    sortable
                    body={(row: PayrollRegulationPackage) => (
                      <div className="flex flex-col">
                        <span>{row.version}</span>
                        {row.supersedes_package_id && (
                          <span className="text-xs text-slate-400">
                            {i18nT("static.j9yc7u")}{" "}
                          </span>
                        )}
                      </div>
                    )}
                  />
                  <Column
                    field="effective_from"
                    header={i18nT("static.ypbwia")}
                    sortable
                    body={(row: PayrollRegulationPackage) =>
                      formatDisplayDate(row.effective_from)
                    }
                  />
                  <Column
                    field="status"
                    header={i18nT("static.3pd73")}
                    body={(row: PayrollRegulationPackage) => (
                      <Tag
                        value={i18nT(formatStatusLabel(row.status))}
                        severity={statusSeverity(row.status)}
                      />
                    )}
                  />
                  <Column
                    header={i18nT("static.2wk0tb")}
                    frozen
                    alignFrozen="right"
                    body={(row: PayrollRegulationPackage) => {
                      const target = nextStatus(row.status);
                      return (
                        <div className="flex justify-end gap-2">
                          <Button
                            icon="pi pi-sliders-h"
                            tooltip={i18nT("static.bjtwnd")}
                            size="small"
                            severity="secondary"
                            outlined
                            aria-label={i18nT("static.m0sp1j")}
                            onClick={() => setSelectedRegulation(row)}
                          />
                          {row.status === "DRAFT" && (
                            <Button
                              label={i18nT("static.1kf2t4f")}
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
                                  ? i18nT("static.191a0ad")
                                  : target === "APPROVED"
                                    ? i18nT("static.1s2ov2y")
                                    : target === "PUBLISHED"
                                      ? i18nT("static.u2m17s")
                                      : i18nT("static.rgquxi")
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
                              {i18nT("static.1fz95qv")}{" "}
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
          <TabPanel
            header={i18nT("static.7wn1ri")}
            leftIcon="pi pi-sitemap mr-2"
          >
            <PayrollComponentMappingPanel
              onSuccess={(message) =>
                toast("success", i18nT("static.udvru8"), message)
              }
              onError={showError}
            />
          </TabPanel>
        </TabView>
      </div>

      <Dialog
        header={i18nT("static.m8xp8g")}
        visible={showSettingDialog}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "34rem" }}
        onHide={() => setShowSettingDialog(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label={i18nT("static.ew9em3")}
              severity="secondary"
              text
              disabled={savingNewSetting}
              onClick={() => setShowSettingDialog(false)}
            />
            <Button
              label={i18nT("static.5vt0p9")}
              icon="pi pi-check"
              loading={savingNewSetting}
              onClick={() => void createSetting()}
            />
          </div>
        }
      >
        <div className="flex flex-col gap-4 pt-2">
          <Field label={i18nT("static.1mnx718")} hint={i18nT("static.e8x4c0")}>
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
          <Field label={i18nT("static.1pde9y5")} hint={i18nT("static.1q07ha6")}>
            <Dropdown
              value={newSetting.branch_id}
              options={branchOptions}
              showClear
              filter
              placeholder={i18nT("static.1yfzsu2")}
              className="w-full"
              onChange={(event) =>
                setNewSetting((current) => ({
                  ...current,
                  branch_id: event.value ? Number(event.value) : null,
                }))
              }
            />
          </Field>
          <Field label={i18nT("static.cnnxc")} hint={i18nT("static.1jpf66l")}>
            <InputText
              value={i18nT("static.669v12")}
              disabled
              className="w-full"
            />
          </Field>
          <Field label={i18nT("static.nv7i1i")} hint={i18nT("static.jggg61")}>
            <div className="flex flex-col gap-2">
              <Dropdown
                value={newSetting.default_proration_method}
                options={prorationMethodOptions}
                optionLabel="localized_name"
                optionValue="code"
                itemTemplate={(method: LocalizedPayrollProrationMethod) =>
                  method ? (
                    <div className="flex flex-col gap-1 py-1">
                      <span className="font-medium text-slate-800">
                        {method.localized_name}
                      </span>
                      <span className="font-mono text-xs text-slate-500">
                        {i18nT("static.140ash2")}{" "}
                        {i18nT(prorationBasisLabel(method))}
                        {method.fixed_divisor_days
                          ? ` (${method.fixed_divisor_days} ${i18nT("days")})`
                          : ""}
                      </span>
                      <span className="text-xs leading-5 text-slate-500">
                        {method.localized_description}
                      </span>
                    </div>
                  ) : null
                }
                placeholder={i18nT("static.1dsf42k")}
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
                  {i18nT(
                    prorationMethodDescription(
                      prorationMethods.find(
                        (method) =>
                          method.code === newSetting.default_proration_method,
                      )!,
                    ),
                  )}
                </span>
              )}
            </div>
          </Field>
          <p className="m-0 text-xs leading-5 text-slate-500">
            {i18nT("static.ovnz1j")}{" "}
          </p>
        </div>
      </Dialog>

      <Dialog
        header={
          editingPeriodRule ? i18nT("static.1yrhahl") : i18nT("static.ly8flw")
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
              label={i18nT("static.ew9em3")}
              severity="secondary"
              text
              disabled={savingPeriodRule}
              onClick={() => setShowPeriodRuleDialog(false)}
            />
            <Button
              label={i18nT("static.1453lae")}
              icon="pi pi-check"
              loading={savingPeriodRule}
              onClick={() => void savePeriodRule()}
            />
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
          <Field label={i18nT("static.ep0d9a")} hint={i18nT("static.mmww9j")}>
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
          <Field label={i18nT("static.5ehpsa")} hint={i18nT("static.au7d1b")}>
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
            <Field
              label={i18nT("static.4f76ga")}
              hint={i18nT("static.1xh4e4o")}
            >
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
        header={i18nT("static.19j22f1")}
        visible={showRegulationDialog}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "44rem" }}
        onHide={() => setShowRegulationDialog(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label={i18nT("static.ew9em3")}
              severity="secondary"
              text
              disabled={savingRegulation}
              onClick={() => setShowRegulationDialog(false)}
            />
            <Button
              label={i18nT("static.4tz1ya")}
              icon="pi pi-check"
              loading={savingRegulation}
              onClick={() => void createRegulation()}
            />
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
          <Field label={i18nT("static.1ej1ao2")}>
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
          <Field label={i18nT("static.13px1al")}>
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
          <Field label={i18nT("static.bpumi0")}>
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
          <Field label={i18nT("static.1nats06")}>
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
          <Field label={i18nT("static.redybm")}>
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
          <Field label={i18nT("static.73t8ux")}>
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
          <Field label={i18nT("static.8lx39w")}>
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
          <Field label={i18nT("static.mtbgcr")}>
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
      <PayrollRegulationVersionWizard
        visible={showVersionWizard}
        packages={regulations ?? []}
        onHide={() => setShowVersionWizard(false)}
        onCreated={async (created) => {
          await refreshRegulations();
          toast(
            "success",
            i18nT("static.1u0pq4v"),
            i18nT("static.1dt75ll", { p0: created.code, p1: created.version }),
          );
        }}
        onError={showError}
      />
      <PayrollRegulationDetailDialog
        regulation={selectedRegulation}
        onHide={() => setSelectedRegulation(null)}
        onSuccess={(message) => {
          toast("success", i18nT("static.udvru8"), message);
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
  const { t: i18nT } = useI18n();
  return (
    <Dialog
      header={i18nT("static.1d9lu4l")}
      visible={testRun !== null}
      modal
      draggable={false}
      resizable={false}
      style={{ width: "96vw", maxWidth: "68rem" }}
      onHide={onHide}
      footer={
        <div className="flex justify-end">
          <Button
            label={i18nT("static.1l0xxoj")}
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
              value={i18nT(formatStatusLabel(testRun.status))}
              severity={testRun.status === "PASSED" ? "success" : "danger"}
            />
            <span>
              {testRun.total_count} {i18nT("static.r02mq8")}
            </span>
            <span className="text-emerald-700">
              {testRun.passed_count} {i18nT("static.mjgec9")}{" "}
            </span>
            <span className="text-rose-700">
              {testRun.failed_count} {i18nT("static.1qc7sfo")}
            </span>
            <span className="text-amber-700">
              {testRun.error_count} {i18nT("static.1xe3tl2")}
            </span>
            <span className="text-slate-500">
              {i18nT("static.1hkietm")} {testRun.configuration_revision}
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
            <Column field="code" header={i18nT("static.xoaiok")} />
            <Column field="name" header={i18nT("static.1lkiw5f")} />
            <Column
              header={i18nT("static.3pd73")}
              body={(row: PayrollRegulationTestCaseResult) => (
                <Tag
                  value={i18nT(formatStatusLabel(row.status))}
                  severity={row.status === "PASSED" ? "success" : "danger"}
                />
              )}
            />
            <Column
              header={i18nT("static.119zxmh")}
              body={(row: PayrollRegulationTestCaseResult) => (
                <JsonValue value={row.expected_output_json} />
              )}
            />
            <Column
              header={i18nT("static.1v23pg7")}
              body={(row: PayrollRegulationTestCaseResult) => (
                <JsonValue value={row.actual_output_json} />
              )}
            />
            <Column field="tolerance" header={i18nT("static.1llx3uw")} />
            <Column
              header={i18nT("static.43f6md")}
              body={(row: PayrollRegulationTestCaseResult) =>
                row.error_message ? (
                  <span className="text-sm text-rose-700">
                    {row.error_message}
                  </span>
                ) : (
                  <span className="text-sm text-slate-400">
                    {i18nT("static.112tcox")}
                  </span>
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
  const { t: i18nT } = useI18n();
  if (value === null || value === undefined) {
    return (
      <span className="text-sm text-slate-400">{i18nT("static.112tcox")}</span>
    );
  }
  return (
    <code className="block max-w-56 whitespace-pre-wrap break-words text-xs text-slate-700">
      {JSON.stringify(value)}
    </code>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="text-xs leading-5 text-slate-500">{hint}</span>}
    </label>
  );
}

function SwitchField({
  label,
  hint,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3">
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {hint && (
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            {hint}
          </span>
        )}
      </div>
      <div className="shrink-0 pt-0.5">
        <InputSwitch
          checked={checked}
          disabled={disabled}
          className="shrink-0"
          onChange={(event) => onChange(Boolean(event.value))}
        />
      </div>
    </div>
  );
}
