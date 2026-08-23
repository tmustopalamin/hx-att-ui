"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Card } from "primereact/card";
import { Dropdown } from "primereact/dropdown";
import { Tag } from "primereact/tag";

import { useI18n } from "@/app/i18n";
import EmployeeScheduleHelpDialog from "./EmployeeScheduleHelpDialog";
import EmployeeSelectionStep, {
  EmployeeSelectionRow,
} from "./EmployeeSelectionStep";
import { fetcher } from "@/app/utils/fetcher";
import { formatDate as formatDisplayDate } from "@/app/utils/date-format";
import { hasPermission } from "@/app/utils/permission-utils";
import { showToast } from "@/store/ToastSlice";
import { RootState } from "@/store/store";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import {
  isResponseTypeError,
  getErrorMessage,
} from "@/app/utils/error-messages";
import {
  applyEmployeeScheduleChange,
  previewEmployeeScheduleChange,
} from "@/app/services/employee-schedule-change-service";
import { Employee } from "@/app/types/employee";
import { EmployeeShiftRule } from "@/app/types/employee-shift-rule";
import { ShiftRule } from "@/app/types/shift-rule";
import {
  EmployeeScheduleChangePreviewResponse,
  EmployeeScheduleChangeRequest,
  EmployeeScheduleChangeTimelineSegment,
} from "@/app/types/employee-schedule-change";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

type EmployeeListRow = EmployeeSelectionRow & Employee;
type ShiftRuleListRow = ShiftRule & { deleted_at?: string | null };

const EMPLOYEE_API_KEY = "/api/employees/list";
const SHIFT_RULE_API_KEY = "/api/shift-rule";
const EMPLOYEE_RULE_API_KEY = "/api/shift-employee?show_all=false";
const MASS_PERMISSIONS = [
  "employee-shift-rule.read",
  "employee-shift-rule.create",
  "employee-shift-rule.update",
  "employee-shift-assignment.read",
  "employee-shift-assignment.generate",
  "employee-shift-assignment.update",
];

const getBody = () => document.body;

const employeeName = (employee?: EmployeeListRow) =>
  employee?.full_name ||
  [employee?.first_name, employee?.middle_name, employee?.last_name]
    .filter(Boolean)
    .join(" ") ||
  (employee ? `#${employee.id}` : "-");

const timelineOverlaps = (
  segment: { effective_from: string; effective_to: string | null },
  from: Date,
  to: Date,
) => {
  const segmentFrom = dayjs(segment.effective_from);
  const segmentTo = segment.effective_to ? dayjs(segment.effective_to) : null;
  return (
    segmentFrom.isSameOrBefore(dayjs(to), "day") &&
    (!segmentTo || segmentTo.isSameOrAfter(dayjs(from), "day"))
  );
};

const formatPeriod = (
  from: string,
  to: string | null,
  format: (value: Date | null) => string,
) => `${format(new Date(from))} – ${to ? format(new Date(to)) : "∞"}`;

const MassScheduleChangeWizard = () => {
  const { t: i18nT } = useI18n();
  const router = useRouter();
  const dispatch = useDispatch();
  const profileState = useSelector((state: RootState) => state.profile);
  const [step, setStep] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [shiftRuleId, setShiftRuleId] = useState<number | null>(null);
  const [effectiveFrom, setEffectiveFrom] = useState<Date | null>(null);
  const [effectiveTo, setEffectiveTo] = useState<Date | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [preview, setPreview] =
    useState<EmployeeScheduleChangePreviewResponse | null>(null);
  const [beforeRules, setBeforeRules] = useState<EmployeeShiftRule[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const {
    data: employeesData,
    error: employeesError,
    isLoading: employeesLoading,
  } = useSWR<EmployeeListRow[]>(EMPLOYEE_API_KEY, fetcher, {
    revalidateOnFocus: false,
  });
  const {
    data: shiftRulesData,
    error: shiftRulesError,
    isLoading: shiftRulesLoading,
  } = useSWR<ShiftRuleListRow[]>(SHIFT_RULE_API_KEY, fetcher, {
    revalidateOnFocus: false,
  });
  const { data: employeeRulesData, mutate: refreshEmployeeRules } = useSWR<
    EmployeeShiftRule[]
  >(EMPLOYEE_RULE_API_KEY, fetcher, {
    revalidateOnFocus: false,
  });

  const employees = useMemo(
    () =>
      (employeesData ?? [])
        .filter(
          (employee) => !employee.deleted_at && employee.is_active !== false,
        )
        .sort((first, second) =>
          employeeName(first).localeCompare(employeeName(second), "id"),
        ),
    [employeesData],
  );
  const shiftRules = useMemo(
    () =>
      (shiftRulesData ?? [])
        .filter((rule) => !rule.deleted_at && rule.is_active !== false)
        .sort((first, second) => first.name.localeCompare(second.name, "id")),
    [shiftRulesData],
  );
  const employeeById = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee])),
    [employees],
  );
  const ruleById = useMemo(
    () => new Map(shiftRules.map((rule) => [rule.id, rule])),
    [shiftRules],
  );
  const selectedRule = shiftRules.find((rule) => rule.id === shiftRuleId);
  const hasInvalidDateRange = Boolean(
    effectiveFrom &&
    effectiveTo &&
    dayjs(effectiveFrom).isAfter(dayjs(effectiveTo), "day"),
  );
  const canOverwrite = hasPermission(
    profileState.permissions,
    "attendance-summary.process",
  );
  const canOpen = MASS_PERMISSIONS.every((permission) =>
    hasPermission(profileState.permissions, permission),
  );

  const showError = (error: unknown) => {
    dispatch(
      showToast({
        visible: true,
        severity: "error",
        summary: i18nT("static.1vks92p"),
        detail: isResponseTypeError(error)
          ? getErrorMessage(error, "message")
          : error instanceof Error
            ? error.message
            : i18nT("static.37lwsc"),
      }),
    );
  };

  const showWarning = (message: string) => {
    dispatch(
      showToast({
        visible: true,
        severity: "warn",
        summary: i18nT("static.gy1qqi"),
        detail: message,
      }),
    );
  };

  const validateConfiguration = () => {
    if (selectedIds.size === 0) {
      showWarning(i18nT("static.1tfchfx"));
      return false;
    }
    if (!shiftRuleId || !effectiveFrom || !effectiveTo) {
      showWarning(i18nT("static.1nmjki7"));
      return false;
    }
    if (hasInvalidDateRange) {
      showWarning(i18nT("static.1el5hxj"));
      return false;
    }
    return true;
  };

  const buildRequest = (previewFingerprint?: string | null) => {
    if (!shiftRuleId || !effectiveFrom || !effectiveTo) return null;
    const request: EmployeeScheduleChangeRequest = {
      employee_ids: Array.from(selectedIds).sort(
        (first, second) => first - second,
      ),
      shift_rule_id: shiftRuleId,
      effective_from: dayjs(effectiveFrom).format("YYYY-MM-DD"),
      effective_to: dayjs(effectiveTo).format("YYYY-MM-DD"),
      attendance_conflict_policy: overwrite
        ? "OVERWRITE_AND_REPROCESS"
        : "BLOCK",
      generate_through: null,
      preview_fingerprint: previewFingerprint ?? null,
    };
    return request;
  };

  const loadPreview = async () => {
    if (!validateConfiguration()) return false;
    const request = buildRequest();
    if (!request) return false;

    setIsBusy(true);
    try {
      const refreshedRules = await refreshEmployeeRules();
      setBeforeRules(refreshedRules ?? employeeRulesData ?? []);
      const response = await previewEmployeeScheduleChange(request);
      setPreview(response.data);
      return true;
    } catch (error: unknown) {
      showError(error);
      return false;
    } finally {
      setIsBusy(false);
    }
  };

  const goNext = async () => {
    if (step === 1) {
      if (selectedIds.size === 0) {
        showWarning(i18nT("static.1tfchfx"));
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      const loaded = await loadPreview();
      if (loaded) setStep(3);
    }
  };

  const goBack = () => {
    if (isBusy) return;
    if (step === 1) {
      router.push("/setting/employee-schedule");
      return;
    }
    setPreview(null);
    setStep((current) => current - 1);
  };

  const applyChange = async () => {
    if (!preview?.can_apply) return;
    const request = buildRequest(preview.fingerprint);
    if (!request) return;

    setIsBusy(true);
    try {
      const response = await applyEmployeeScheduleChange(request);
      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: i18nT("static.udvru8"),
          detail: response.message || i18nT("static.14lv1xk"),
        }),
      );
      router.push(
        `/setting/employee-schedule?from=${request.effective_from}&to=${request.effective_to}`,
      );
    } catch (error: unknown) {
      if (
        isResponseTypeError(error) &&
        error.code === "SCHEDULE_PREVIEW_STALE"
      ) {
        setPreview(null);
        showWarning(i18nT("static.1t477m1"));
      } else {
        showError(error);
      }
    } finally {
      setIsBusy(false);
    }
  };

  const confirmApply = () => {
    if (!preview?.can_apply) return;
    requestActionConfirmation({
      header: i18nT("static.14lv1xk"),
      message: (
        <div className="flex flex-col gap-3 text-sm text-slate-600">
          <p className="m-0">{i18nT("static.emss5")}</p>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-x-3 gap-y-2">
              <span>{i18nT("static.fywzdp")}</span>
              <strong>{selectedRule?.name || "-"}</strong>
              <span>{i18nT("static.f4bo3a")}</span>
              <strong>{selectedIds.size}</strong>
              <span>{i18nT("static.19xoda3")}</span>
              <strong>
                {formatDisplayDate(effectiveFrom)} –{" "}
                {formatDisplayDate(effectiveTo)}
              </strong>
            </div>
          </div>
        </div>
      ),
      defaultFocus: "reject",
      accept: () => void applyChange(),
      reject: () => undefined,
    });
  };

  const beforeByEmployee = useMemo(() => {
    const map = new Map<number, EmployeeShiftRule[]>();
    if (!effectiveFrom || !effectiveTo) return map;
    for (const row of beforeRules) {
      if (!selectedIds.has(row.employee_id)) continue;
      if (!timelineOverlaps(row, effectiveFrom, effectiveTo)) continue;
      const current = map.get(row.employee_id) ?? [];
      current.push(row);
      map.set(row.employee_id, current);
    }
    return map;
  }, [beforeRules, effectiveFrom, effectiveTo, selectedIds]);

  const formatTimeline = (timeline: EmployeeScheduleChangeTimelineSegment[]) =>
    timeline.map((segment) => {
      const ruleName =
        ruleById.get(segment.shift_rule_id)?.name ||
        `#${segment.shift_rule_id}`;
      return `${ruleName} (${formatPeriod(segment.effective_from, segment.effective_to, (value) => formatDisplayDate(value))})`;
    });

  if (employeesError || shiftRulesError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {i18nT("static.37lwsc")}
      </div>
    );
  }

  if (!canOpen) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        {i18nT("static.employeeScheduleNoAccess")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <Button
                type="button"
                icon="pi pi-arrow-left"
                rounded
                text
                severity="secondary"
                aria-label={i18nT("static.1hzmxtu")}
                tooltip={i18nT("static.1hzmxtu")}
                tooltipOptions={{ appendTo: getBody, position: "top" }}
                onClick={goBack}
              />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="m-0 text-xl font-semibold text-slate-800 sm:text-2xl">
                    {i18nT("static.15ge9fu")}
                  </h1>
                  <Button
                    type="button"
                    icon="pi pi-info-circle"
                    rounded
                    text
                    severity="secondary"
                    aria-label={i18nT("static.1x2sh5o")}
                    tooltip={i18nT("static.1x2sh5o")}
                    tooltipOptions={{ appendTo: getBody, position: "top" }}
                    onClick={() => setShowHelp(true)}
                  />
                </div>
                <p className="m-0 mt-1 text-sm text-slate-500">
                  {i18nT("static.6x84cg")}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              i18nT("static.sadvsn"),
              i18nT("static.employeeScheduleConfigure"),
              i18nT("static.11fdnd6"),
            ].map((label, index) => (
              <div
                key={label}
                className={`rounded-lg border p-3 text-center text-xs ${step === index + 1 ? "border-blue-300 bg-blue-50 text-blue-800" : "border-slate-200 bg-slate-50 text-slate-500"}`}
              >
                <span className="font-semibold">{index + 1}. </span>
                {label}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="border border-slate-200 shadow-sm">
        <div className="p-4 sm:p-5">
          {step === 1 && (
            <EmployeeSelectionStep
              employees={employees}
              selectedIds={selectedIds}
              disabled={isBusy || employeesLoading}
              onToggle={(id) => {
                setPreview(null);
                setSelectedIds((current) => {
                  const next = new Set(current);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                });
              }}
              onSelect={(ids) => {
                setPreview(null);
                setSelectedIds(new Set(ids));
              }}
              onClear={() => {
                setPreview(null);
                setSelectedIds(new Set());
              }}
            />
          )}

          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="m-0 text-base font-semibold text-slate-800">
                  {i18nT("static.19hwlpo")}
                </h2>
                <p className="m-0 mt-1 text-xs text-slate-500">
                  {i18nT("static.77pz7e")}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="mass_shift_rule"
                    className="text-sm font-medium text-slate-700"
                  >
                    {i18nT("static.qlsvoz")}
                  </label>
                  <Dropdown
                    id="mass_shift_rule"
                    value={shiftRuleId}
                    options={shiftRules}
                    optionLabel="name"
                    optionValue="id"
                    filter
                    showClear
                    loading={shiftRulesLoading}
                    disabled={isBusy}
                    placeholder={i18nT("static.1tvus0p")}
                    className="w-full"
                    onChange={(event) => {
                      setShiftRuleId(event.value ?? null);
                      setPreview(null);
                    }}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="mass_effective_from"
                    className="text-sm font-medium text-slate-700"
                  >
                    {i18nT("static.ypbwia")}
                  </label>
                  <Calendar
                    id="mass_effective_from"
                    value={effectiveFrom}
                    dateFormat="dd MM yy"
                    showIcon
                    maxDate={effectiveTo ?? undefined}
                    disabled={isBusy}
                    className="w-full"
                    onChange={(event) => {
                      setEffectiveFrom((event.value as Date | null) ?? null);
                      setPreview(null);
                    }}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="mass_effective_to"
                    className="text-sm font-medium text-slate-700"
                  >
                    {i18nT("static.mtbgcr")}
                  </label>
                  <Calendar
                    id="mass_effective_to"
                    value={effectiveTo}
                    dateFormat="dd MM yy"
                    showIcon
                    minDate={effectiveFrom ?? undefined}
                    disabled={isBusy}
                    className="w-full"
                    onChange={(event) => {
                      setEffectiveTo((event.value as Date | null) ?? null);
                      setPreview(null);
                    }}
                  />
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <label className="flex items-start gap-3 text-sm font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={overwrite}
                    disabled={isBusy || !canOverwrite}
                    onChange={(event) => {
                      setOverwrite(event.target.checked);
                      setPreview(null);
                    }}
                  />
                  <span>{i18nT("static.75jhmu")}</span>
                </label>
                <div className="mt-2 flex items-start gap-2 text-xs leading-5 text-slate-500">
                  <i className="pi pi-info-circle mt-0.5" />
                  <span>{i18nT("static.1rdsjzn")}</span>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="m-0 text-base font-semibold text-slate-800">
                    {i18nT("static.11fdnd6")}
                  </h2>
                  <p className="m-0 mt-1 text-xs text-slate-500">
                    {i18nT("static.xuipnj")}
                  </p>
                </div>
                <Tag
                  value={
                    preview?.can_apply
                      ? i18nT("static.ranbcx")
                      : i18nT("static.1r45c2b")
                  }
                  severity={preview?.can_apply ? "success" : "danger"}
                  rounded
                />
              </div>

              {!preview && !isBusy && (
                <Button
                  type="button"
                  label={i18nT("static.z7xv16")}
                  icon="pi pi-eye"
                  onClick={() => void loadPreview()}
                />
              )}

              {preview && (
                <>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs text-slate-500">
                        {i18nT("static.f4bo3a")}
                      </div>
                      <div className="mt-1 text-xl font-semibold">
                        {preview.totals.employees}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs text-slate-500">
                        {i18nT("static.1evh1st")}
                      </div>
                      <div className="mt-1 text-xl font-semibold">
                        {preview.totals.assignments_to_insert +
                          preview.totals.assignments_to_update}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs text-slate-500">
                        {i18nT("static.1f41f32")}
                      </div>
                      <div className="mt-1 text-xl font-semibold">
                        {preview.totals.assignments_to_archive}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs text-slate-500">
                        {i18nT("static.14tx1bf")}
                      </div>
                      <div className="mt-1 text-xl font-semibold">
                        {preview.totals.attendance_rows_to_reprocess}
                      </div>
                    </div>
                  </div>

                  {preview.conflicts.length > 0 && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                      <div className="font-semibold">
                        {i18nT("static.1c5yboc")}
                        {preview.conflicts.length})
                      </div>
                      <div className="mt-2 flex max-h-48 flex-col gap-2 overflow-y-auto text-xs">
                        {preview.conflicts.map((conflict, index) => (
                          <div
                            key={`${conflict.code}-${conflict.employee_id ?? "all"}-${index}`}
                          >
                            <strong>{conflict.code}</strong> {conflict.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[56rem] text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-3 py-3">
                            {i18nT("static.1fak8xt")}
                          </th>
                          <th className="px-3 py-3">
                            {i18nT("static.employeeScheduleBefore")}
                          </th>
                          <th className="px-3 py-3">
                            {i18nT("static.employeeScheduleAfter")}
                          </th>
                          <th className="px-3 py-3">
                            {i18nT("static.employeeScheduleImpact")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.employees.map((employeePreview) => {
                          const before = (
                            beforeByEmployee.get(employeePreview.employee_id) ??
                            []
                          ).map(
                            (row) =>
                              `${ruleById.get(row.shift_rule_id)?.name || `#${row.shift_rule_id}`} (${formatPeriod(row.effective_from, row.effective_to, (value) => formatDisplayDate(value))})`,
                          );
                          const after = formatTimeline(
                            employeePreview.timeline,
                          );
                          return (
                            <tr
                              key={employeePreview.employee_id}
                              className="border-t border-slate-100 align-top"
                            >
                              <td className="px-3 py-3 font-semibold text-slate-800">
                                {employeeName(
                                  employeeById.get(employeePreview.employee_id),
                                )}
                              </td>
                              <td className="px-3 py-3 text-xs text-slate-600">
                                {before.length > 0 ? before.join("; ") : "-"}
                              </td>
                              <td className="px-3 py-3 text-xs text-slate-600">
                                {after.length > 0 ? after.join("; ") : "-"}
                              </td>
                              <td className="px-3 py-3 text-xs text-slate-600">
                                {employeePreview.assignments_to_insert +
                                  employeePreview.assignments_to_update}{" "}
                                / {employeePreview.assignments_to_archive}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="mt-5 flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-between">
            <Button
              type="button"
              label={i18nT("static.1hzmxtu")}
              icon="pi pi-arrow-left"
              severity="secondary"
              outlined
              disabled={isBusy}
              onClick={goBack}
            />
            {step < 3 ? (
              <Button
                type="button"
                label={i18nT("static.employeeScheduleNext")}
                icon="pi pi-arrow-right"
                iconPos="right"
                loading={isBusy}
                onClick={() => void goNext()}
              />
            ) : (
              <div className="flex gap-2">
                <Button
                  type="button"
                  label={i18nT("static.z7xv16")}
                  icon="pi pi-refresh"
                  severity="secondary"
                  outlined
                  loading={isBusy}
                  onClick={() => void loadPreview()}
                />
                <Button
                  type="button"
                  label={i18nT("static.14lv1xk")}
                  icon="pi pi-check"
                  severity="success"
                  disabled={isBusy || !preview?.can_apply}
                  onClick={confirmApply}
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      <EmployeeScheduleHelpDialog
        visible={showHelp}
        onHide={() => setShowHelp(false)}
      />
    </div>
  );
};

export default MassScheduleChangeWizard;
