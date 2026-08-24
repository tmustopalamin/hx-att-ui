"use client";
import { useI18n } from "@/app/i18n";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import useSWR from "swr";
import dayjs from "dayjs";
import { formatDate as formatDisplayDate } from "@/app/utils/date-format";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { InputTextarea } from "primereact/inputtextarea";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";
import PrimeDatePicker from "@/app/_components/PrimeDatePicker";
import type { Employee, EmployeeApprovalOption } from "@/app/types/employee";
import type {
  EmployeeLifecycleCase,
  EmployeeLifecycleDetail,
  EmploymentChangeProposal,
  LifecycleType,
  NewEmployeeLifecycleCase,
} from "@/app/types/employee-lifecycle";
import {
  assignEmployeeLifecycleTask,
  cancelEmployeeLifecycleCase,
  createEmployeeLifecycleCase,
  getEmployeeLifecycleCase,
  getEmployeeLifecycleCases,
  submitEmployeeLifecycleCase,
} from "@/app/services/employee-lifecycle-service";
import {
  getAgencyOptions,
  getApprovalEmployeeOptions,
  getBranchOptions,
  getDepartmentOptions,
  getEmploymentStatusOptions,
  getPositionOptions,
} from "@/app/services/employee-general-service";
import type {
  EmployeeEmploymentData,
  OptionItem,
} from "@/app/types/employee-general";
import { fetcher } from "@/app/utils/fetcher";
import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { showToast } from "@/store/ToastSlice";
import type { RootState } from "@/store/store";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import { useDirtyFormGuard } from "@/app/_components/useDirtyFormGuard";
import { isWhitespaceFreeIdentifier } from "@/app/utils/identifier-validation";

const emptyForm = (): NewEmployeeLifecycleCase => ({
  employee_id: 0,
  lifecycle_type: "ONBOARDING",
  effective_date: "",
  reason: null,
  payload_json: {},
});
const emptyEmploymentChange = (): EmploymentChangeProposal => ({
  join_date: null,
  code: null,
  agency_id: null,
  branch_id: null,
  department_id: null,
  position_id: null,
  employment_status_id: null,
  supervisor_employee_id: null,
  end_date: null,
  probation_end_date: null,
  confirmation_date: null,
  notes: null,
});

const toCalendarDate = (value?: string | null): Date | null =>
  value ? dayjs(value).toDate() : null;

const toDateString = (value: Date | null | undefined): string | null =>
  value ? dayjs(value).format("YYYY-MM-DD") : null;

const getBody = () => document.body;
const statusSeverity = (
  status: string,
): "success" | "danger" | "warning" | "secondary" =>
  status === "COMPLETED" || status === "IN_PROGRESS"
    ? "success"
    : status === "REJECTED" || status === "CANCELLED"
      ? "danger"
      : status === "DRAFT"
        ? "secondary"
        : "warning";

export default function EmployeeLifecycleData() {
  const { t: i18nT } = useI18n();
  const searchParams = useSearchParams();
  const profile = useSelector((state: RootState) => state.profile);
  const dispatch = useDispatch();
  const [selected, setSelected] = useState<EmployeeLifecycleCase | null>(null);
  const [assignmentTask, setAssignmentTask] = useState<
    EmployeeLifecycleDetail["tasks"][number] | null
  >(null);
  const [taskAssignment, setTaskAssignment] = useState({
    assignedEmployeeId: null as number | null,
    dueDate: "",
  });
  const [visible, setVisible] = useState(false);
  const [form, setForm] = useState<NewEmployeeLifecycleCase>(emptyForm);
  const [employmentChange, setEmploymentChange] =
    useState<EmploymentChangeProposal>(emptyEmploymentChange);
  const [saving, setSaving] = useState(false);
  const lifecycleFormDirty =
    visible &&
    (form.employee_id > 0 ||
      form.lifecycle_type !== "ONBOARDING" ||
      Boolean(form.effective_date) ||
      Boolean(form.reason?.trim()) ||
      Object.values(employmentChange).some(
        (value) => value !== null && value !== "",
      ));
  const { confirmDiscard } = useDirtyFormGuard(lifecycleFormDirty, !saving);
  const didPrefillRequest = useRef(false);
  const employmentPrefillEmployeeId = useRef<number | null>(null);
  const canCreate = profile.permissions.includes("employee-lifecycle.create");
  const canUpdate = profile.permissions.includes("employee-lifecycle.update");
  const {
    data: cases,
    error,
    isValidating,
    mutate,
  } = useSWR("employee-lifecycle", getEmployeeLifecycleCases);
  const { data: employees = [] } = useSWR<Employee[]>(
    "/api/employees/list?show_all=false",
    fetcher,
  );
  const { data: approvalEmployees = [] } = useSWR<EmployeeApprovalOption[]>(
    "employee-lifecycle/approval-options",
    getApprovalEmployeeOptions,
  );
  const requestedEmployeeId = Number(searchParams.get("employee_id"));
  const requestedType = searchParams.get("type");
  const { data: requestedEmployment } = useSWR<EmployeeEmploymentData | null>(
    Number.isSafeInteger(requestedEmployeeId) && requestedEmployeeId > 0
      ? `/api/employees/${requestedEmployeeId}/employment-data`
      : null,
    fetcher,
  );
  const selectedEmploymentKey =
    form.lifecycle_type === "EMPLOYMENT_CHANGE" && form.employee_id > 0
      ? `/api/employees/${form.employee_id}/employment-data`
      : null;
  const {
    data: selectedEmployeeEmployment,
    error: selectedEmploymentError,
    isValidating: isValidatingSelectedEmployment,
  } = useSWR<EmployeeEmploymentData | null>(selectedEmploymentKey, fetcher);
  const { data: departments = [] } = useSWR<OptionItem[]>(
    "employee-lifecycle/departments",
    getDepartmentOptions,
  );
  const { data: positions = [] } = useSWR<
    (OptionItem & { department_id?: number | null })[]
  >("employee-lifecycle/positions", getPositionOptions);
  const { data: employmentStatuses = [] } = useSWR<OptionItem[]>(
    "employee-lifecycle/employment-statuses",
    getEmploymentStatusOptions,
  );
  const { data: agencies = [] } = useSWR<OptionItem[]>(
    "employee-lifecycle/agencies",
    getAgencyOptions,
  );
  const { data: branches = [] } = useSWR<
    (OptionItem & { agency_id?: number | null })[]
  >("employee-lifecycle/branches", getBranchOptions);
  const detail = useSWR<EmployeeLifecycleDetail>(
    selected ? `employee-lifecycle/${selected.id}` : null,
    () => getEmployeeLifecycleCase(selected!.id),
  );
  const employeeOptions = useMemo(
    () =>
      employees.map((employee) => ({
        label:
          employee.full_name ||
          i18nT("static.y7k7q", {
            p0: employee.first_name,
            p1: employee.last_name,
          }),
        value: employee.id,
      })),
    [employees],
  );
  const approvalEmployeeOptions = useMemo(
    () =>
      approvalEmployees.map((employee) => ({
        label: employee.name,
        value: employee.id,
      })),
    [approvalEmployees],
  );
  const assignmentOptions = useMemo(() => {
    if (assignmentTask?.assignment_source === "SUPERVISOR") {
      return approvalEmployeeOptions;
    }
    if (assignmentTask?.assignment_source === "EMPLOYEE") {
      return employeeOptions.filter(
        (option) => option.value === selected?.employee_id,
      );
    }
    return employeeOptions;
  }, [
    approvalEmployeeOptions,
    assignmentTask?.assignment_source,
    employeeOptions,
    selected?.employee_id,
  ]);
  const positionOptions = useMemo(
    () =>
      positions.filter(
        (position) =>
          !employmentChange.department_id ||
          !position.department_id ||
          Number(position.department_id) === employmentChange.department_id,
      ),
    [positions, employmentChange.department_id],
  );
  const branchOptions = useMemo(
    () =>
      branches.filter(
        (branch) =>
          employmentChange.agency_id &&
          (!branch.agency_id ||
            Number(branch.agency_id) === employmentChange.agency_id),
      ),
    [branches, employmentChange.agency_id],
  );
  useEffect(() => {
    if (
      didPrefillRequest.current ||
      !canCreate ||
      requestedType !== "EMPLOYMENT_CHANGE" ||
      !Number.isSafeInteger(requestedEmployeeId) ||
      requestedEmployeeId <= 0
    ) {
      return;
    }
    didPrefillRequest.current = true;
    setForm({
      ...emptyForm(),
      employee_id: requestedEmployeeId,
      lifecycle_type: "EMPLOYMENT_CHANGE",
      effective_date: new Date().toISOString().slice(0, 10),
    });
    if (requestedEmployment) {
      setEmploymentChange({
        ...emptyEmploymentChange(),
        join_date: requestedEmployment.join_date ?? null,
        code: requestedEmployment.code ?? null,
        agency_id: requestedEmployment.agency_id ?? null,
        branch_id: requestedEmployment.branch_id ?? null,
        department_id: requestedEmployment.department_id ?? null,
        position_id: requestedEmployment.position_id ?? null,
        employment_status_id: requestedEmployment.employment_status_id ?? null,
        supervisor_employee_id:
          requestedEmployment.supervisor_employee_id ?? null,
        end_date: requestedEmployment.end_date ?? null,
        probation_end_date: requestedEmployment.probation_end_date ?? null,
        confirmation_date: requestedEmployment.confirmation_date ?? null,
      });
    }
    setVisible(true);
  }, [canCreate, requestedEmployeeId, requestedEmployment, requestedType]);
  useEffect(() => {
    if (
      requestedType !== "EMPLOYMENT_CHANGE" ||
      !requestedEmployment ||
      !Number.isSafeInteger(requestedEmployeeId) ||
      requestedEmployeeId <= 0
    ) {
      return;
    }
    setEmploymentChange({
      ...emptyEmploymentChange(),
      join_date: requestedEmployment.join_date ?? null,
      code: requestedEmployment.code ?? null,
      agency_id: requestedEmployment.agency_id ?? null,
      branch_id: requestedEmployment.branch_id ?? null,
      department_id: requestedEmployment.department_id ?? null,
      position_id: requestedEmployment.position_id ?? null,
      employment_status_id: requestedEmployment.employment_status_id ?? null,
      supervisor_employee_id:
        requestedEmployment.supervisor_employee_id ?? null,
      end_date: requestedEmployment.end_date ?? null,
      probation_end_date: requestedEmployment.probation_end_date ?? null,
      confirmation_date: requestedEmployment.confirmation_date ?? null,
    });
  }, [requestedEmployeeId, requestedEmployment, requestedType]);
  useEffect(() => {
    if (form.lifecycle_type !== "EMPLOYMENT_CHANGE" || form.employee_id <= 0) {
      employmentPrefillEmployeeId.current = null;
      return;
    }
    if (
      employmentPrefillEmployeeId.current === form.employee_id ||
      isValidatingSelectedEmployment
    ) {
      return;
    }

    employmentPrefillEmployeeId.current = form.employee_id;
    if (selectedEmployeeEmployment) {
      setEmploymentChange({
        ...emptyEmploymentChange(),
        join_date: selectedEmployeeEmployment.join_date ?? null,
        code: selectedEmployeeEmployment.code ?? null,
        agency_id: selectedEmployeeEmployment.agency_id ?? null,
        branch_id: selectedEmployeeEmployment.branch_id ?? null,
        department_id: selectedEmployeeEmployment.department_id ?? null,
        position_id: selectedEmployeeEmployment.position_id ?? null,
        employment_status_id:
          selectedEmployeeEmployment.employment_status_id ?? null,
        supervisor_employee_id:
          selectedEmployeeEmployment.supervisor_employee_id ?? null,
        end_date: selectedEmployeeEmployment.end_date ?? null,
        probation_end_date:
          selectedEmployeeEmployment.probation_end_date ?? null,
        confirmation_date: selectedEmployeeEmployment.confirmation_date ?? null,
      });
    }
  }, [
    form.employee_id,
    form.lifecycle_type,
    isValidatingSelectedEmployment,
    selectedEmployeeEmployment,
  ]);
  const notify = (
    severity: "success" | "error",
    summary: string,
    detailMessage: string,
  ) =>
    dispatch(
      showToast({ visible: true, severity, summary, detail: detailMessage }),
    );

  const createCase = async () => {
    if (!form.employee_id || !form.effective_date) {
      notify("error", i18nT("static.gy1qqi"), i18nT("static.1flvj5o"));
      return;
    }
    if (!isWhitespaceFreeIdentifier(employmentChange.code)) {
      notify(
        "error",
        i18nT("static.gy1qqi"),
        i18nT("validation.codeNoWhitespace"),
      );
      return;
    }
    const proposedJoinDate = employmentChange.join_date?.trim() || null;
    const currentJoinDate =
      selectedEmployeeEmployment?.join_date ??
      requestedEmployment?.join_date ??
      null;
    if (
      form.lifecycle_type === "EMPLOYMENT_CHANGE" &&
      proposedJoinDate !== null &&
      proposedJoinDate !== currentJoinDate &&
      !form.reason?.trim()
    ) {
      notify("error", i18nT("static.gy1qqi"), i18nT("static.vjpj6d"));
      return;
    }
    setSaving(true);
    try {
      const payload_json =
        form.lifecycle_type === "EMPLOYMENT_CHANGE"
          ? { employment: employmentChange }
          : {};
      await createEmployeeLifecycleCase({
        ...form,
        payload_json,
        reason: form.reason?.trim() || null,
      });
      setVisible(false);
      setForm(emptyForm());
      setEmploymentChange(emptyEmploymentChange());
      await mutate();
      notify("success", i18nT("static.axd5v1"), i18nT("static.2mahnm"));
    } catch (error: unknown) {
      notify(
        "error",
        i18nT("static.1nvorn3"),
        isResponseTypeError(error)
          ? getErrorMessage(error, "message")
          : error instanceof Error
            ? error.message
            : i18nT("static.o4lwju"),
      );
    } finally {
      setSaving(false);
    }
  };
  const closeCreateCase = () => {
    if (saving) return;
    if (!lifecycleFormDirty) {
      setVisible(false);
      return;
    }
    void confirmDiscard().then((discard) => {
      if (discard) setVisible(false);
    });
  };
  const transition = async (
    row: EmployeeLifecycleCase,
    action: "submit" | "cancel",
  ) => {
    setSaving(true);
    try {
      if (action === "submit")
        await submitEmployeeLifecycleCase(row.id, row.row_version);
      else await cancelEmployeeLifecycleCase(row.id, row.row_version);
      await mutate();
      if (selected?.id === row.id) await detail.mutate();
      notify(
        "success",
        i18nT("static.1gzdoqg"),
        action === "submit" ? i18nT("static.jobjnw") : i18nT("static.r7lfpo"),
      );
    } catch (error: unknown) {
      notify(
        "error",
        i18nT("static.1nvorn3"),
        isResponseTypeError(error)
          ? getErrorMessage(error, "message")
          : error instanceof Error
            ? error.message
            : i18nT("static.16ypw6a"),
      );
    } finally {
      setSaving(false);
    }
  };
  const confirmTransition = (
    row: EmployeeLifecycleCase,
    action: "submit" | "cancel",
  ) => {
    const isCancel = action === "cancel";
    requestActionConfirmation({
      action: isCancel ? i18nT("static.1snqs45") : i18nT("static.1xvck6n"),
      target: `${row.employee_name} · ${row.lifecycle_type.replaceAll("_", " ")}`,
      severity: isCancel ? "danger" : "warning",
      confirmLabel: isCancel ? i18nT("static.13r863p") : i18nT("static.jub85"),
      confirmIcon: isCancel ? "pi pi-times" : "pi pi-send",
      description: isCancel ? i18nT("static.16ja080") : i18nT("static.cl1222"),
      onAccept: () => transition(row, action),
    });
  };
  const assignTask = async (
    taskId: number,
    rowVersion: number,
    employeeId: number | null,
    dueDate: string | null,
  ): Promise<boolean> => {
    if (!selected || detail.data?.case.status !== "DRAFT") {
      notify("error", i18nT("static.2ed3hr"), i18nT("static.1y4e1q7"));
      return false;
    }
    setSaving(true);
    try {
      await assignEmployeeLifecycleTask(
        selected.id,
        taskId,
        rowVersion,
        employeeId,
        dueDate,
      );
      await detail.mutate();
      notify("success", i18nT("static.hm62rc"), i18nT("static.1xqf4cr"));
      return true;
    } catch {
      notify("error", i18nT("static.2ed3hr"), i18nT("static.u0xwqp"));
      return false;
    } finally {
      setSaving(false);
    }
  };
  const openAssignment = (task: EmployeeLifecycleDetail["tasks"][number]) => {
    setAssignmentTask(task);
    setTaskAssignment({
      assignedEmployeeId: task.assigned_employee_id,
      dueDate: task.due_date || "",
    });
  };
  if (error)
    return (
      <Card className="border border-red-200">
        <p className="m-0 text-sm text-red-600">{i18nT("static.1t27id1")} </p>
      </Card>
    );

  return (
    <>
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="hidden h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:flex">
                <i className="pi pi-directions-alt text-xl" />
              </div>
              <div>
                <h1 className="m-0 text-xl font-semibold text-slate-800 sm:text-2xl">
                  {i18nT("static.1hkrool")}{" "}
                </h1>
                <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                  {i18nT("static.pyph62")}{" "}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                label={i18nT("static.28r6qc")}
                icon="pi pi-refresh"
                severity="secondary"
                outlined
                size="small"
                loading={isValidating}
                onClick={() => void mutate()}
              />
              {canCreate && (
                <Button
                  label={i18nT("static.1kydyv7")}
                  icon="pi pi-plus"
                  size="small"
                  onClick={() => setVisible(true)}
                />
              )}
            </div>
          </div>
          <DataTable
            value={cases ?? []}
            dataKey="id"
            loading={isValidating}
            paginator
            rows={10}
            stripedRows
            rowHover
            size="small"
            tableStyle={{ minWidth: "60rem" }}
            emptyMessage={i18nT("static.15o2um4")}
          >
            <Column
              header="#"
              body={(_: EmployeeLifecycleCase, options: { rowIndex: number }) =>
                options.rowIndex + 1
              }
              style={{ width: "4rem" }}
            />
            <Column
              header={i18nT("static.1fak8xt")}
              body={(row: EmployeeLifecycleCase) => (
                <span className="font-medium text-slate-800">
                  {row.employee_name}
                </span>
              )}
            />
            <Column field="lifecycle_type" header={i18nT("static.1m2zofh")} />
            <Column field="requested_by_name" header={i18nT("static.crwzgc")} />
            <Column
              field="effective_date"
              header={i18nT("static.dfnnk2")}
              body={(row: EmployeeLifecycleCase) =>
                formatDisplayDate(row.effective_date)
              }
            />
            <Column
              header={i18nT("static.3pd73")}
              body={(row: EmployeeLifecycleCase) => (
                <Tag value={row.status} severity={statusSeverity(row.status)} />
              )}
            />
            <Column
              header={i18nT("static.2wk0tb")}
              frozen
              alignFrozen="right"
              body={(row: EmployeeLifecycleCase) => {
                const isLifecycleOwner =
                  row.requested_by === profile.employee_id;
                return (
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      icon="pi pi-eye"
                      text
                      rounded
                      severity="secondary"
                      aria-label={i18nT("static.1dtxu7d")}
                      tooltip={i18nT("static.1dtxu7d")}
                      onClick={() => setSelected(row)}
                    />
                    {canCreate &&
                      row.status === "DRAFT" &&
                      isLifecycleOwner && (
                        <Button
                          icon="pi pi-send"
                          text
                          rounded
                          aria-label={i18nT("static.hvztxh")}
                          tooltip={i18nT("static.hvztxh")}
                          disabled={saving}
                          onClick={() => confirmTransition(row, "submit")}
                        />
                      )}
                    {canCreate &&
                      row.status === "DRAFT" &&
                      !isLifecycleOwner && (
                        <span className="text-xs text-slate-500">
                          {i18nT("static.jrks31")}{" "}
                        </span>
                      )}
                    {canUpdate &&
                      isLifecycleOwner &&
                      (row.status === "DRAFT" ||
                        row.status === "PENDING_APPROVAL") && (
                        <Button
                          icon="pi pi-times"
                          text
                          rounded
                          severity="danger"
                          aria-label={i18nT("static.ew9em3")}
                          tooltip={i18nT("static.ew9em3")}
                          disabled={saving}
                          onClick={() => confirmTransition(row, "cancel")}
                        />
                      )}
                  </div>
                );
              }}
            />
          </DataTable>
        </div>
      </Card>
      <Dialog
        header={i18nT("static.6eh5nx")}
        visible={visible}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "48rem" }}
        onHide={closeCreateCase}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              label={i18nT("static.ew9em3")}
              text
              severity="secondary"
              disabled={saving}
              onClick={closeCreateCase}
            />
            <Button
              label={i18nT("static.i9z1e3")}
              icon="pi pi-check"
              loading={saving}
              disabled={saving}
              onClick={() => void createCase()}
            />
          </div>
        }
      >
        <div className="grid gap-4 py-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.1fak8xt")}{" "}
            <Dropdown
              value={form.employee_id || null}
              options={employeeOptions}
              filter
              placeholder={i18nT("static.1izgm0n")}
              className="w-full"
              onChange={(event) =>
                (() => {
                  const employeeId = (event.value as number | null) ?? 0;
                  setForm({ ...form, employee_id: employeeId });
                  if (form.lifecycle_type === "EMPLOYMENT_CHANGE") {
                    employmentPrefillEmployeeId.current = null;
                    setEmploymentChange(emptyEmploymentChange());
                  }
                })()
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.1cozql1")}{" "}
            <Dropdown
              value={form.lifecycle_type}
              options={["ONBOARDING", "EMPLOYMENT_CHANGE", "OFFBOARDING"]}
              className="w-full"
              onChange={(event) => {
                const lifecycle_type = event.value as LifecycleType;
                setForm({ ...form, lifecycle_type });
                if (lifecycle_type !== "EMPLOYMENT_CHANGE")
                  setEmploymentChange(emptyEmploymentChange());
              }}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.dfnnk2")}{" "}
            <PrimeDatePicker
              value={form.effective_date}
              onValueChange={(value) =>
                setForm({ ...form, effective_date: value })
              }
            />
          </label>
          {form.lifecycle_type === "EMPLOYMENT_CHANGE" && (
            <section className="grid gap-4 rounded-lg border border-blue-100 bg-blue-50/50 p-4">
              <div>
                <h2 className="m-0 text-base font-semibold text-slate-800">
                  {i18nT("static.1tv99jr")}{" "}
                </h2>
                <p className="m-0 mt-1 text-sm text-slate-500">
                  {i18nT("static.130hlrk")}{" "}
                </p>
                {form.employee_id > 0 && isValidatingSelectedEmployment && (
                  <p className="m-0 mt-2 text-sm text-blue-700">
                    {i18nT("static.m5xnue")}{" "}
                  </p>
                )}
                {form.employee_id > 0 &&
                  !isValidatingSelectedEmployment &&
                  !selectedEmployeeEmployment && (
                    <p className="m-0 mt-2 text-sm text-slate-600">
                      {selectedEmploymentError
                        ? i18nT("static.b2lqgq")
                        : i18nT("static.19ibo7o")}
                    </p>
                  )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  {i18nT("static.136fqhb")}{" "}
                  <span className="text-red-500">*</span>
                  <Calendar
                    value={toCalendarDate(employmentChange.join_date)}
                    appendTo={getBody}
                    dateFormat="dd MM yy"
                    showIcon
                    showButtonBar
                    maxDate={toCalendarDate(form.effective_date) ?? undefined}
                    className="w-full"
                    onChange={(event) =>
                      setEmploymentChange({
                        ...employmentChange,
                        join_date: toDateString(event.value),
                      })
                    }
                  />
                  <small className="font-normal text-slate-500">
                    {i18nT("static.jzduoe")}{" "}
                  </small>
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  {i18nT("static.ncb762")}{" "}
                  <InputText
                    value={employmentChange.code ?? ""}
                    onChange={(event) =>
                      setEmploymentChange({
                        ...employmentChange,
                        code: event.target.value || null,
                      })
                    }
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  {i18nT("static.p2ngjv")}{" "}
                  <Dropdown
                    value={employmentChange.employment_status_id}
                    options={employmentStatuses.filter(
                      (item) => item.is_active !== false,
                    )}
                    optionLabel="name"
                    optionValue="id"
                    filter
                    placeholder={i18nT("static.loo409")}
                    className="w-full"
                    onChange={(event) =>
                      setEmploymentChange({
                        ...employmentChange,
                        employment_status_id: event.value as number,
                      })
                    }
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  {i18nT("static.1430r53")}{" "}
                  <Dropdown
                    value={employmentChange.department_id}
                    options={departments.filter(
                      (item) => item.is_active !== false,
                    )}
                    optionLabel="name"
                    optionValue="id"
                    filter
                    placeholder={i18nT("static.sln621")}
                    className="w-full"
                    onChange={(event) =>
                      setEmploymentChange({
                        ...employmentChange,
                        department_id: event.value as number,
                        position_id: null,
                      })
                    }
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  {i18nT("static.1quewx6")}{" "}
                  <Dropdown
                    value={employmentChange.position_id}
                    options={positionOptions.filter(
                      (item) => item.is_active !== false,
                    )}
                    optionLabel="name"
                    optionValue="id"
                    filter
                    placeholder={i18nT("static.1e100xw")}
                    className="w-full"
                    onChange={(event) =>
                      setEmploymentChange({
                        ...employmentChange,
                        position_id: event.value as number,
                      })
                    }
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  {i18nT("static.1v3zejm")}{" "}
                  <Dropdown
                    value={employmentChange.agency_id}
                    options={agencies.filter(
                      (item) => item.is_active !== false,
                    )}
                    optionLabel="name"
                    optionValue="id"
                    showClear
                    filter
                    placeholder={i18nT("static.1aklnvk")}
                    className="w-full"
                    onChange={(event) =>
                      setEmploymentChange({
                        ...employmentChange,
                        agency_id: (event.value as number | null) ?? null,
                        branch_id: null,
                      })
                    }
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  {i18nT("static.19gzx45")}{" "}
                  <Dropdown
                    value={employmentChange.branch_id}
                    options={branchOptions.filter(
                      (item) => item.is_active !== false,
                    )}
                    optionLabel="name"
                    optionValue="id"
                    showClear
                    filter
                    disabled={!employmentChange.agency_id}
                    placeholder={i18nT("static.17q9myv")}
                    className="w-full"
                    onChange={(event) =>
                      setEmploymentChange({
                        ...employmentChange,
                        branch_id: (event.value as number | null) ?? null,
                      })
                    }
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  {i18nT("static.1q1b9we")}{" "}
                  <Dropdown
                    value={employmentChange.supervisor_employee_id}
                    options={approvalEmployeeOptions.filter(
                      (item) => item.value !== form.employee_id,
                    )}
                    showClear
                    filter
                    placeholder={i18nT("static.xhzk5d")}
                    emptyMessage={i18nT("static.1j4mgrb")}
                    className="w-full"
                    onChange={(event) =>
                      setEmploymentChange({
                        ...employmentChange,
                        supervisor_employee_id:
                          (event.value as number | null) ?? null,
                      })
                    }
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  {i18nT("static.t3xfbi")}{" "}
                  <span className="font-normal text-slate-400">
                    {i18nT("static.6pi6gi")}
                  </span>
                  <Calendar
                    value={toCalendarDate(employmentChange.end_date)}
                    appendTo={getBody}
                    dateFormat="dd MM yy"
                    showIcon
                    showButtonBar
                    minDate={toCalendarDate(form.effective_date) ?? undefined}
                    className="w-full"
                    onChange={(event) =>
                      setEmploymentChange({
                        ...employmentChange,
                        end_date: toDateString(event.value),
                      })
                    }
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  {i18nT("static.1ignfpe")}{" "}
                  <span className="font-normal text-slate-400">
                    {i18nT("static.6pi6gi")}
                  </span>
                  <Calendar
                    value={toCalendarDate(employmentChange.probation_end_date)}
                    appendTo={getBody}
                    dateFormat="dd MM yy"
                    showIcon
                    showButtonBar
                    className="w-full"
                    onChange={(event) =>
                      setEmploymentChange({
                        ...employmentChange,
                        probation_end_date: toDateString(event.value),
                      })
                    }
                  />
                  <small className="font-normal text-slate-500">
                    {i18nT("static.z1om5q")}{" "}
                  </small>
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  {i18nT("static.404n94")}{" "}
                  <span className="font-normal text-slate-400">
                    {i18nT("static.6pi6gi")}
                  </span>
                  <Calendar
                    value={toCalendarDate(employmentChange.confirmation_date)}
                    appendTo={getBody}
                    dateFormat="dd MM yy"
                    showIcon
                    showButtonBar
                    className="w-full"
                    onChange={(event) =>
                      setEmploymentChange({
                        ...employmentChange,
                        confirmation_date: toDateString(event.value),
                      })
                    }
                  />
                  <small className="font-normal text-slate-500">
                    {i18nT("static.16ota2k")}{" "}
                  </small>
                </label>
              </div>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                {i18nT("static.qe13rq")}{" "}
                <span className="font-normal text-slate-400">
                  {i18nT("static.6pi6gi")}
                </span>
                <InputTextarea
                  value={employmentChange.notes ?? ""}
                  rows={3}
                  autoResize
                  onChange={(event) =>
                    setEmploymentChange({
                      ...employmentChange,
                      notes: event.target.value || null,
                    })
                  }
                />
              </label>
            </section>
          )}
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.i36sl5")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.l467u2")}{" "}
            </span>
            <InputTextarea
              value={form.reason ?? ""}
              rows={3}
              autoResize
              onChange={(event) =>
                setForm({ ...form, reason: event.target.value })
              }
            />
          </label>
        </div>
      </Dialog>
      <Dialog
        header={
          selected
            ? i18nT("static.1t1akqf", {
                p0: selected.lifecycle_type.replace("_", " "),
                p1: selected.employee_name,
              })
            : i18nT("static.k0tscs")
        }
        visible={selected !== null}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "58rem" }}
        onHide={() => setSelected(null)}
        footer={
          <div className="flex justify-end">
            <Button
              label={i18nT("static.1l0xxoj")}
              text
              severity="secondary"
              onClick={() => setSelected(null)}
            />
          </div>
        }
      >
        {detail.data ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              {i18nT("static.iox8eg")}{" "}
              <span className="font-medium text-slate-800">
                {formatDisplayDate(detail.data.case.effective_date)}
              </span>
              <span className="ml-4 text-slate-500">
                {i18nT("static.y9d3wy")}{" "}
              </span>
              <span className="font-medium text-slate-800">
                {detail.data.case.requested_by_name}
              </span>
              {detail.data.case.reason && (
                <p className="mb-0 mt-2">{detail.data.case.reason}</p>
              )}
            </div>
            <DataTable
              value={detail.data.tasks}
              dataKey="id"
              size="small"
              stripedRows
            >
              <Column
                field="sequence_no"
                header="#"
                style={{ width: "4rem" }}
              />
              <Column field="name" header={i18nT("static.7u5nck")} />
              <Column
                header={i18nT("static.q3tmuu")}
                body={(row: EmployeeLifecycleDetail["tasks"][number]) =>
                  row.assignment_source === "ROLE"
                    ? `Role: ${row.assignment_role_code ?? row.owner_scope}`
                    : row.assignment_source === "SUPERVISOR"
                      ? "Supervisor / Manager"
                      : row.assignment_source === "EMPLOYEE"
                        ? "Lifecycle Employee"
                        : "Manual Assignment"
                }
              />
              <Column
                header={i18nT("static.brgbpm")}
                body={(row: EmployeeLifecycleDetail["tasks"][number]) =>
                  employeeOptions.find(
                    (option) => option.value === row.assigned_employee_id,
                  )?.label ?? "Unassigned"
                }
              />
              <Column
                header={i18nT("static.vtfgln")}
                body={(row: EmployeeLifecycleDetail["tasks"][number]) =>
                  formatDisplayDate(row.due_date, "—")
                }
              />
              <Column
                header={i18nT("static.mq0cow")}
                body={(row: EmployeeLifecycleDetail["tasks"][number]) =>
                  row.is_required ? "Yes" : "No"
                }
              />
              <Column
                header={i18nT("static.3pd73")}
                body={(row: EmployeeLifecycleDetail["tasks"][number]) => (
                  <Tag
                    value={row.status}
                    severity={
                      row.status === "COMPLETED" ? "success" : "warning"
                    }
                  />
                )}
              />
              {canUpdate && (
                <Column
                  header={i18nT("static.2wk0tb")}
                  body={(row: EmployeeLifecycleDetail["tasks"][number]) => (
                    <div className="flex gap-1">
                      <Button
                        label={i18nT("static.1f128rw")}
                        icon="pi pi-user-edit"
                        text
                        size="small"
                        disabled={
                          saving ||
                          detail.data?.case.status !== "DRAFT" ||
                          row.status !== "PENDING"
                        }
                        onClick={() => openAssignment(row)}
                      />
                    </div>
                  )}
                />
              )}
            </DataTable>
          </div>
        ) : (
          <p className="text-sm text-slate-500">{i18nT("static.ic10ii")}</p>
        )}
      </Dialog>
      <Dialog
        header={
          assignmentTask
            ? i18nT("static.52qwj2", { p0: assignmentTask.name })
            : i18nT("static.763x61")
        }
        visible={assignmentTask !== null}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "34rem" }}
        onHide={() => {
          if (!saving) setAssignmentTask(null);
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label={i18nT("static.ew9em3")}
              severity="secondary"
              outlined
              disabled={saving}
              onClick={() => setAssignmentTask(null)}
            />
            <Button
              label={i18nT("static.1mwuwmp")}
              icon="pi pi-check"
              loading={saving}
              disabled={saving || detail.data?.case.status !== "DRAFT"}
              onClick={() => {
                if (!assignmentTask) return;
                requestActionConfirmation({
                  action: i18nT("static.qix09q"),
                  target: assignmentTask.name,
                  severity: "info",
                  confirmLabel: i18nT("static.1mwuwmp"),
                  confirmIcon: "pi pi-check",
                  description: i18nT("static.um5zmr"),
                  onAccept: async () => {
                    const isSaved = await assignTask(
                      assignmentTask.id,
                      assignmentTask.row_version,
                      taskAssignment.assignedEmployeeId,
                      taskAssignment.dueDate || null,
                    );
                    if (isSaved) setAssignmentTask(null);
                  },
                });
              }}
            />
          </div>
        }
      >
        <div className="grid gap-4 py-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.1tztaqr")}{" "}
            <Dropdown
              value={taskAssignment.assignedEmployeeId}
              options={assignmentOptions}
              optionLabel="label"
              optionValue="value"
              filter
              showClear
              placeholder={i18nT("static.1izgm0n")}
              emptyMessage={
                assignmentTask?.assignment_source === "SUPERVISOR"
                  ? i18nT("static.1j4mgrb")
                  : i18nT("static.1digqk")
              }
              className="w-full"
              disabled={
                saving ||
                detail.data?.case.status !== "DRAFT" ||
                assignmentTask?.assignment_source === "EMPLOYEE"
              }
              onChange={(event) =>
                setTaskAssignment({
                  ...taskAssignment,
                  assignedEmployeeId: event.value ?? null,
                })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.vtfgln")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.6pi6gi")}
            </span>
            <PrimeDatePicker
              value={taskAssignment.dueDate}
              className="w-full"
              disabled={saving || detail.data?.case.status !== "DRAFT"}
              onValueChange={(value) =>
                setTaskAssignment({ ...taskAssignment, dueDate: value })
              }
            />
          </label>
          <p className="m-0 text-xs leading-5 text-slate-500">
            {i18nT("static.kjd6be")}{" "}
          </p>
        </div>
      </Dialog>
    </>
  );
}
