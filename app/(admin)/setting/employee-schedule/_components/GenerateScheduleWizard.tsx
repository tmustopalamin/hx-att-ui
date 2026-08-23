"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Card } from "primereact/card";
import { useI18n } from "@/app/i18n";
import EmployeeSelectionStep, {
  EmployeeSelectionRow,
} from "./EmployeeSelectionStep";
import EmployeeScheduleHelpDialog from "./EmployeeScheduleHelpDialog";
import { fetcher } from "@/app/utils/fetcher";
import { createEmployeeShiftAssignment } from "@/app/services/employee-shift-assignment-service";
import { Employee } from "@/app/types/employee";
import { NewEmployeeShiftAssignment } from "@/app/types/employee-shift-assignment";
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

  const goBack = () => {
    if (isBusy) return;
    if (step === 1) {
      router.push("/setting/employee-schedule");
      return;
    }
    setStep((current) => current - 1);
  };

  const generate = async () => {
    if (!validate() || !periodFrom || !actualTo) return;

    const payload: NewEmployeeShiftAssignment = {
      employee_ids: Array.from(selectedIds).sort(
        (first, second) => first - second,
      ),
      date_from: dayjs(periodFrom).format("YYYY-MM-DD"),
      date_to: periodTo ? dayjs(periodTo).format("YYYY-MM-DD") : null,
      overwrite,
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
      showError(error);
    } finally {
      setIsBusy(false);
    }
  };

  const confirmGenerate = () => {
    if (!validate() || !periodFrom || !actualTo) return;
    requestActionConfirmation({
      header: i18nT("static.qnqnib"),
      message: (
        <div className="flex flex-col gap-3">
          <span className="text-slate-600">{i18nT("static.ckd1lf")}</span>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-x-3 gap-y-2">
              <span>{i18nT("static.f4bo3a")}</span>
              <strong>{selectedIds.size}</strong>
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
            <EmployeeSelectionStep
              employees={employees}
              selectedIds={selectedIds}
              disabled={isBusy || employeesLoading}
              onToggle={(id) =>
                setSelectedIds((current) => {
                  const next = new Set(current);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
              onSelect={(ids) => setSelectedIds(new Set(ids))}
              onClear={() => setSelectedIds(new Set())}
            />
          )}

          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="m-0 text-base font-semibold text-slate-800">
                  {i18nT("static.19hwlpo")}
                </h2>
                <p className="m-0 mt-1 text-xs text-slate-500">
                  {i18nT("static.1fdehkf")}
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
                    onChange={(event) =>
                      setPeriodFrom((event.value as Date | null) ?? null)
                    }
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
                    onChange={(event) =>
                      setPeriodTo((event.value as Date | null) ?? null)
                    }
                  />
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <label className="flex items-start gap-3 text-sm font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={overwrite}
                    disabled={isBusy}
                    onChange={(event) => setOverwrite(event.target.checked)}
                  />
                  <span>{i18nT("static.75jhmu")}</span>
                </label>
                <p className="m-0 mt-2 pl-7 text-xs leading-5 text-slate-500">
                  {i18nT("static.1rdsjzn")}
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
                  {i18nT("static.tnr3lt")}
                </h2>
                <p className="m-0 mt-1 text-xs text-slate-500">
                  {i18nT("static.1nmjki7")}
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
                onClick={() => {
                  if (step === 1 && selectedIds.size === 0) {
                    showError(new Error(i18nT("static.1tfchfx")));
                    return;
                  }
                  if (step === 2 && !validate()) return;
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
