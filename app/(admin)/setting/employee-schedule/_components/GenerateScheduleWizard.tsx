"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Card } from "primereact/card";
import { Tag } from "primereact/tag";
import { useI18n } from "@/app/i18n";
import EmployeeSelectionStep, {
  EmployeeSelectionRow,
} from "./EmployeeSelectionStep";
import EmployeeScheduleHelpDialog from "./EmployeeScheduleHelpDialog";
import { fetcher } from "@/app/utils/fetcher";
import {
  createEmployeeShiftAssignment,
  previewEmployeeShiftAssignment,
} from "@/app/services/employee-shift-assignment-service";
import { Employee } from "@/app/types/employee";
import {
  EmployeeShiftAssignmentEmployeePreview,
  EmployeeShiftAssignmentPreviewRequest,
  EmployeeShiftAssignmentPreviewResponse,
  EmployeeShiftAssignmentPreviewStatus,
  NewEmployeeShiftAssignment,
} from "@/app/types/employee-shift-assignment";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import { showToast } from "@/store/ToastSlice";
import { RootState } from "@/store/store";
import { hasPermission } from "@/app/utils/permission-utils";
import {
  isResponseTypeError,
  getErrorMessage,
} from "@/app/utils/error-messages";

type EmployeeListRow = EmployeeSelectionRow & Employee;
const EMPLOYEE_API_KEY = "/api/employees/list";
const getBody = () => document.body;

const statusLabelKey: Record<EmployeeShiftAssignmentPreviewStatus, string> = {
  READY_TO_GENERATE: "static.employeeScheduleReadyToGenerate",
  ALREADY_COMPLETE: "static.employeeScheduleAlreadyComplete",
  PARTIAL_CONFIGURATION: "static.employeeSchedulePartialConfiguration",
  NO_ACTIVE_RULE: "static.employeeScheduleNoActiveRule",
};

const statusSeverity = (status: EmployeeShiftAssignmentPreviewStatus) => {
  switch (status) {
    case "READY_TO_GENERATE":
      return "success";
    case "PARTIAL_CONFIGURATION":
      return "warning";
    case "NO_ACTIVE_RULE":
      return "danger";
    default:
      return "secondary";
  }
};

const employeeName = (employee?: EmployeeListRow) =>
  employee?.full_name ||
  [employee?.first_name, employee?.middle_name, employee?.last_name]
    .filter(Boolean)
    .join(" ") ||
  (employee ? `Employee #${employee.id}` : "Employee");

const GenerateScheduleWizard = () => {
  const { t: i18nT } = useI18n();
  const router = useRouter();
  const dispatch = useDispatch();
  const profileState = useSelector((state: RootState) => state.profile);

  const [step, setStep] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [periodFrom, setPeriodFrom] = useState<Date | null>(null);
  const [periodTo, setPeriodTo] = useState<Date | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [preview, setPreview] =
    useState<EmployeeShiftAssignmentPreviewResponse | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const {
    data: employeesData,
    error: employeesError,
    isLoading: employeesLoading,
  } = useSWR<EmployeeListRow[]>(EMPLOYEE_API_KEY, fetcher, {
    revalidateOnFocus: false,
  });

  const employees = useMemo(
    () =>
      (employeesData ?? []).filter(
        (employee) => !employee.deleted_at && employee.is_active !== false,
      ),
    [employeesData],
  );
  const employeeById = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee])),
    [employees],
  );
  const actualTo = periodFrom
    ? (periodTo ?? dayjs(periodFrom).endOf("year").toDate())
    : null;
  const hasInvalidDateRange = Boolean(
    periodFrom && periodTo && dayjs(periodFrom).isAfter(dayjs(periodTo), "day"),
  );
  const canGenerate = hasPermission(
    profileState.permissions,
    "employee-shift-assignment.generate",
  );
  const canOverwrite = hasPermission(
    profileState.permissions,
    "employee-shift-assignment.update",
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

  const validate = () => {
    if (selectedIds.size === 0) {
      showError(new Error(i18nT("static.1tfchfx")));
      return false;
    }
    if (!periodFrom) {
      showError(new Error(i18nT("static.ypbwia")));
      return false;
    }
    if (hasInvalidDateRange) {
      showError(new Error(i18nT("static.1el5hxj")));
      return false;
    }
    return true;
  };

  const getPreviewRequest =
    (): EmployeeShiftAssignmentPreviewRequest | null => {
      if (!periodFrom) return null;

      return {
        employee_ids: Array.from(selectedIds).sort(
          (first, second) => first - second,
        ),
        date_from: dayjs(periodFrom).format("YYYY-MM-DD"),
        date_to: periodTo ? dayjs(periodTo).format("YYYY-MM-DD") : null,
        overwrite,
      };
    };

  const goBack = () => {
    if (isBusy) return;
    if (step === 1) {
      router.push("/setting/employee-schedule");
      return;
    }
    setStep((current) => current - 1);
  };

  const loadPreview = async () => {
    if (!validate()) return;
    const request = getPreviewRequest();
    if (!request) return;

    setIsBusy(true);
    try {
      const response = await previewEmployeeShiftAssignment(request);
      setPreview(response.data);
      setStep(3);
    } catch (error: unknown) {
      showError(error);
    } finally {
      setIsBusy(false);
    }
  };

  const generate = async () => {
    if (!validate() || !periodFrom || !actualTo) return;
    if (!preview) {
      showError(
        new Error(i18nT("static.employeeScheduleGeneratePreviewRequired")),
      );
      return;
    }
    if (!preview.can_apply) {
      showError(new Error(i18nT("static.employeeScheduleGenerateNoChanges")));
      return;
    }

    const payload: NewEmployeeShiftAssignment = {
      employee_ids: Array.from(selectedIds).sort(
        (first, second) => first - second,
      ),
      date_from: dayjs(periodFrom).format("YYYY-MM-DD"),
      date_to: periodTo ? dayjs(periodTo).format("YYYY-MM-DD") : null,
      overwrite,
      preview_fingerprint: preview.fingerprint,
      row_version: 1,
    };

    setIsBusy(true);
    try {
      const response = await createEmployeeShiftAssignment(payload);
      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: i18nT("static.udvru8"),
          detail: response.message || i18nT("static.1fw4b2w"),
        }),
      );
      router.push(
        `/setting/employee-schedule?from=${payload.date_from}&to=${payload.date_to || dayjs(actualTo).format("YYYY-MM-DD")}`,
      );
    } catch (error: unknown) {
      if (
        isResponseTypeError(error) &&
        error.code === "SCHEDULE_GENERATE_PREVIEW_STALE"
      ) {
        setPreview(null);
      }
      showError(error);
    } finally {
      setIsBusy(false);
    }
  };

  const confirmGenerate = () => {
    if (!validate() || !periodFrom || !actualTo) return;
    if (!preview) {
      showError(
        new Error(i18nT("static.employeeScheduleGeneratePreviewRequired")),
      );
      return;
    }
    if (!preview.can_apply) {
      showError(new Error(i18nT("static.employeeScheduleGenerateNoChanges")));
      return;
    }
    requestActionConfirmation({
      header: i18nT("static.qnqnib"),
      message: (
        <div className="flex flex-col gap-3">
          <span className="text-slate-600">{i18nT("static.ckd1lf")}</span>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-x-3 gap-y-2">
              <span>{i18nT("static.employeeScheduleCandidateEmployees")}</span>
              <strong>{preview.totals.candidate_employees}</strong>
              <span>{i18nT("static.employeeScheduleEmployeesToProcess")}</span>
              <strong>{preview.totals.employees_to_process}</strong>
              <span>{i18nT("static.employeeScheduleEmployeesSkipped")}</span>
              <strong>{preview.totals.employees_skipped}</strong>
              <span>{i18nT("static.employeeScheduleAssignmentsToInsert")}</span>
              <strong>{preview.totals.assignments_to_insert}</strong>
              <span>{i18nT("static.employeeScheduleAssignmentsToUpdate")}</span>
              <strong>{preview.totals.assignments_to_update}</strong>
              <span>{i18nT("static.11hwh7o")}</span>
              <strong>
                {dayjs(periodFrom).format("DD MMM YYYY")} –{" "}
                {dayjs(actualTo).format("DD MMM YYYY")}
              </strong>
              <span>{i18nT("static.141yy28")}</span>
              <strong>
                {dayjs(actualTo).diff(dayjs(periodFrom), "day") + 1}
              </strong>
              <span>{i18nT("static.n44ilu")}</span>
              <strong>
                {overwrite ? i18nT("static.rywwgw") : i18nT("static.1wavinv")}
              </strong>
            </div>
          </div>
        </div>
      ),
      defaultFocus: "reject",
      accept: () => void generate(),
      reject: () => undefined,
    });
  };

  const renderEmployeePreview = (
    employeePreview: EmployeeShiftAssignmentEmployeePreview,
  ) => {
    const employee = employeeById.get(employeePreview.employee_id);

    return (
      <tr
        key={employeePreview.employee_id}
        className="border-t border-slate-100"
      >
        <td className="px-3 py-3 align-top">
          <div className="font-medium text-slate-800">
            {employeeName(employee)}
          </div>
          {employee?.code && (
            <div className="mt-1 text-xs text-slate-500">{employee.code}</div>
          )}
        </td>
        <td className="px-3 py-3 align-top">
          <Tag
            value={i18nT(statusLabelKey[employeePreview.status])}
            severity={statusSeverity(employeePreview.status)}
            rounded
          />
          {employeePreview.status !== "READY_TO_GENERATE" && (
            <div className="mt-2 max-w-xs text-xs text-slate-500">
              {employeePreview.status === "ALREADY_COMPLETE"
                ? i18nT("static.employeeScheduleSkippedReason")
                : employeePreview.status === "NO_ACTIVE_RULE"
                  ? i18nT("static.employeeScheduleNoActiveRule")
                  : i18nT("static.employeeSchedulePartialConfiguration")}
            </div>
          )}
        </td>
        <td className="px-3 py-3 align-top text-sm text-slate-700">
          {employeePreview.rule_segments.length > 0 ? (
            <div className="flex flex-col gap-1">
              {employeePreview.rule_segments.map((segment) => (
                <div key={`${segment.shift_rule_id}-${segment.effective_from}`}>
                  <span className="font-medium">
                    {segment.shift_rule_name || `#${segment.shift_rule_id}`}
                  </span>
                  <span className="ml-1 text-xs text-slate-500">
                    ({dayjs(segment.effective_from).format("DD MMM YYYY")} -{" "}
                    {segment.effective_to
                      ? dayjs(segment.effective_to).format("DD MMM YYYY")
                      : "..."}
                    )
                  </span>
                </div>
              ))}
            </div>
          ) : (
            "-"
          )}
        </td>
        <td className="px-3 py-3 align-top text-right text-sm">
          <div className="font-semibold text-emerald-700">
            {employeePreview.assignments_to_insert}
          </div>
          <div className="text-xs text-slate-500">
            {i18nT("static.employeeScheduleAssignmentsToInsert")}
          </div>
          {employeePreview.assignments_to_update > 0 && (
            <div className="mt-2 font-semibold text-amber-700">
              {employeePreview.assignments_to_update}{" "}
              {i18nT("static.employeeScheduleAssignmentsToUpdate")}
            </div>
          )}
        </td>
        <td className="px-3 py-3 align-top text-right text-sm text-slate-600">
          <div>{employeePreview.assignments_unchanged}</div>
          <div className="text-xs">
            {i18nT("static.employeeScheduleAssignmentsUnchanged")}
          </div>
          {employeePreview.protected_assignments > 0 && (
            <div className="mt-2 text-xs text-amber-700">
              {employeePreview.protected_assignments}{" "}
              {i18nT("static.employeeScheduleProtectedAssignments")}
            </div>
          )}
          {employeePreview.unconfigured_days > 0 && (
            <div className="mt-1 text-xs text-red-700">
              {employeePreview.unconfigured_days}{" "}
              {i18nT("static.employeeScheduleUnconfiguredDays")}
            </div>
          )}
        </td>
      </tr>
    );
  };

  if (employeesError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {i18nT("static.37lwsc")}
      </div>
    );
  }
  if (!canGenerate) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        {i18nT("static.11gikqr")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-4 p-4 sm:p-5">
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
                  {i18nT("static.a0nkg3")}
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
                {i18nT("static.1fdehkf")}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              i18nT("static.sadvsn"),
              i18nT("static.19hwlpo"),
              i18nT("static.tnr3lt"),
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
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                {i18nT("static.employeeScheduleGenerateSelectionHint")}
              </div>
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
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="m-0 text-base font-semibold text-slate-800">
                  {i18nT("static.19hwlpo")}
                </h2>
                <p className="m-0 mt-1 text-xs text-slate-500">
                  {i18nT("static.employeeScheduleGenerateSelectionReview")}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="generate_from"
                    className="text-sm font-medium text-slate-700"
                  >
                    {i18nT("static.ypbwia")}
                  </label>
                  <Calendar
                    id="generate_from"
                    value={periodFrom}
                    dateFormat="dd MM yy"
                    showIcon
                    className="w-full"
                    disabled={isBusy}
                    onChange={(event) => {
                      setPreview(null);
                      setPeriodFrom((event.value as Date | null) ?? null);
                    }}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="generate_to"
                    className="text-sm font-medium text-slate-700"
                  >
                    {i18nT("static.mtbgcr")}
                  </label>
                  <Calendar
                    id="generate_to"
                    value={periodTo}
                    dateFormat="dd MM yy"
                    showIcon
                    minDate={periodFrom ?? undefined}
                    className="w-full"
                    disabled={isBusy}
                    onChange={(event) => {
                      setPreview(null);
                      setPeriodTo((event.value as Date | null) ?? null);
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
                      setPreview(null);
                      setOverwrite(event.target.checked);
                    }}
                  />
                  <span>
                    {i18nT("static.employeeScheduleGenerateOverwrite")}
                  </span>
                </label>
                <p className="m-0 mt-2 pl-7 text-xs leading-5 text-slate-500">
                  {i18nT("static.employeeScheduleGenerateOverwriteHint")}
                </p>
              </div>
              {hasInvalidDateRange && (
                <p className="m-0 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {i18nT("static.1el5hxj")}
                </p>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="m-0 text-base font-semibold text-slate-800">
                  {i18nT("static.employeeScheduleGeneratePreview")}
                </h2>
                <p className="m-0 mt-1 text-xs text-slate-500">
                  {i18nT("static.employeeScheduleGeneratePreviewDescription")}
                </p>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
                <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-x-3 gap-y-2">
                  <span>{i18nT("static.f4bo3a")}</span>
                  <strong>{selectedIds.size}</strong>
                  <span>{i18nT("static.11hwh7o")}</span>
                  <strong>
                    {periodFrom && actualTo
                      ? `${dayjs(periodFrom).format("DD MMM YYYY")} – ${dayjs(actualTo).format("DD MMM YYYY")}`
                      : "-"}
                  </strong>
                  <span>{i18nT("static.141yy28")}</span>
                  <strong>
                    {periodFrom && actualTo
                      ? dayjs(actualTo).diff(dayjs(periodFrom), "day") + 1
                      : 0}
                  </strong>
                  <span>{i18nT("static.n44ilu")}</span>
                  <strong>
                    {overwrite
                      ? i18nT("static.rywwgw")
                      : i18nT("static.1wavinv")}
                  </strong>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  label={i18nT("static.employeeScheduleGenerateRefreshPreview")}
                  icon="pi pi-refresh"
                  severity="secondary"
                  outlined
                  loading={isBusy}
                  onClick={() => void loadPreview()}
                />
              </div>
              {preview ? (
                <>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[
                      [
                        i18nT("static.employeeScheduleCandidateEmployees"),
                        preview.totals.candidate_employees,
                      ],
                      [
                        i18nT("static.employeeScheduleEmployeesToProcess"),
                        preview.totals.employees_to_process,
                      ],
                      [
                        i18nT("static.employeeScheduleEmployeesSkipped"),
                        preview.totals.employees_skipped,
                      ],
                      [
                        i18nT("static.employeeScheduleAssignmentsToInsert"),
                        preview.totals.assignments_to_insert,
                      ],
                      [
                        i18nT("static.employeeScheduleAssignmentsToUpdate"),
                        preview.totals.assignments_to_update,
                      ],
                      [
                        i18nT("static.employeeScheduleAssignmentsUnchanged"),
                        preview.totals.assignments_unchanged,
                      ],
                      [
                        i18nT("static.employeeScheduleProtectedAssignments"),
                        preview.totals.protected_assignments,
                      ],
                      [
                        i18nT("static.employeeScheduleUnconfiguredDays"),
                        preview.totals.unconfigured_days,
                      ],
                    ].map(([label, value]) => (
                      <div
                        key={String(label)}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="text-xs text-slate-500">{label}</div>
                        <div className="mt-1 text-xl font-semibold text-slate-800">
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                  {preview.totals.unconfigured_days > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      {i18nT("static.employeeSchedulePartialConfiguration")}
                    </div>
                  )}
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[58rem] border-collapse text-left">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-3 py-3">
                            {i18nT("static.f4bo3a")}
                          </th>
                          <th className="px-3 py-3">
                            {i18nT("static.employeeScheduleStatus")}
                          </th>
                          <th className="px-3 py-3">
                            {i18nT("static.employeeScheduleRule")}
                          </th>
                          <th className="px-3 py-3 text-right">
                            {i18nT("static.employeeScheduleAction")}
                          </th>
                          <th className="px-3 py-3 text-right">
                            {i18nT(
                              "static.employeeScheduleAssignmentsUnchanged",
                            )}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.employees.map(renderEmployeePreview)}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  {i18nT("static.employeeScheduleGeneratePreviewRequired")}
                </div>
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
                onClick={() => {
                  if (step === 1 && selectedIds.size === 0) {
                    showError(new Error(i18nT("static.1tfchfx")));
                    return;
                  }
                  if (step === 2) {
                    void loadPreview();
                    return;
                  }
                  setStep((current) => current + 1);
                }}
              />
            ) : (
              <Button
                type="button"
                label={i18nT("static.a0nkg3")}
                icon="pi pi-calendar-plus"
                severity="success"
                loading={isBusy}
                disabled={!preview?.can_apply}
                onClick={confirmGenerate}
              />
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

export default GenerateScheduleWizard;
