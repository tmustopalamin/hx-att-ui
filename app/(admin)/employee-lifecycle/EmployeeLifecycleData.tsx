"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import useSWR from "swr";
import dayjs from "dayjs";
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

const emptyForm = (): NewEmployeeLifecycleCase => ({
  employee_id: 0,
  lifecycle_type: "ONBOARDING",
  effective_date: "",
  reason: null,
  payload_json: {},
});
const emptyEmploymentChange = (): EmploymentChangeProposal => ({
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
          employee.full_name || `${employee.first_name} ${employee.last_name}`,
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
      notify(
        "error",
        "Validation",
        "Employee and effective date are required.",
      );
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
      notify(
        "success",
        "Lifecycle case created",
        "The case is ready to be submitted.",
      );
    } catch (error: unknown) {
      notify(
        "error",
        "Lifecycle",
        isResponseTypeError(error)
          ? getErrorMessage(error, "message")
          : error instanceof Error
            ? error.message
            : "Unable to create lifecycle case. Review the employment data and try again.",
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
        "Lifecycle updated",
        action === "submit"
          ? "Case submitted for approval."
          : "Case cancelled.",
      );
    } catch (error: unknown) {
      notify(
        "error",
        "Lifecycle",
        isResponseTypeError(error)
          ? getErrorMessage(error, "message")
          : error instanceof Error
            ? error.message
            : "Request could not be processed. Refresh and try again.",
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
      action: isCancel ? "Cancel lifecycle case" : "Submit lifecycle case",
      target: `${row.employee_name} · ${row.lifecycle_type.replaceAll("_", " ")}`,
      severity: isCancel ? "danger" : "warning",
      confirmLabel: isCancel ? "Cancel Case" : "Submit for Approval",
      confirmIcon: isCancel ? "pi pi-times" : "pi pi-send",
      description: isCancel
        ? "Cancel this lifecycle case?"
        : "Submit this lifecycle case for approval?",
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
      notify(
        "error",
        "Checklist",
        "Task assignment is locked after the lifecycle is submitted.",
      );
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
      notify(
        "success",
        "Checklist updated",
        "Task owner and due date updated.",
      );
      return true;
    } catch {
      notify("error", "Checklist", "Task assignment could not be updated.");
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
        <p className="m-0 text-sm text-red-600">
          Unable to load employee lifecycle data.
        </p>
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
                  Employee Lifecycle
                </h1>
                <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                  Manage onboarding, employment changes, and offboarding with an
                  auditable checklist.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                label="Refresh"
                icon="pi pi-refresh"
                severity="secondary"
                outlined
                size="small"
                loading={isValidating}
                onClick={() => void mutate()}
              />
              {canCreate && (
                <Button
                  label="New Lifecycle Case"
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
            emptyMessage="No employee lifecycle case found."
          >
            <Column
              header="#"
              body={(_: EmployeeLifecycleCase, options: { rowIndex: number }) =>
                options.rowIndex + 1
              }
              style={{ width: "4rem" }}
            />
            <Column
              header="Employee"
              body={(row: EmployeeLifecycleCase) => (
                <span className="font-medium text-slate-800">
                  {row.employee_name}
                </span>
              )}
            />
            <Column field="lifecycle_type" header="Type" />
            <Column field="requested_by_name" header="Lifecycle Owner" />
            <Column field="effective_date" header="Effective Date" />
            <Column
              header="Status"
              body={(row: EmployeeLifecycleCase) => (
                <Tag value={row.status} severity={statusSeverity(row.status)} />
              )}
            />
            <Column
              header="Action"
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
                      aria-label="View detail"
                      onClick={() => setSelected(row)}
                    />
                    {canCreate &&
                      row.status === "DRAFT" &&
                      isLifecycleOwner && (
                        <Button
                          icon="pi pi-send"
                          text
                          rounded
                          aria-label="Submit"
                          disabled={saving}
                          onClick={() => confirmTransition(row, "submit")}
                        />
                      )}
                    {canCreate &&
                      row.status === "DRAFT" &&
                      !isLifecycleOwner && (
                        <span className="text-xs text-slate-500">
                          Owner submits
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
                          aria-label="Cancel"
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
        header="New Employee Lifecycle Case"
        visible={visible}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "48rem" }}
        onHide={closeCreateCase}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              label="Cancel"
              text
              severity="secondary"
              disabled={saving}
              onClick={closeCreateCase}
            />
            <Button
              label="Create Case"
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
            Employee
            <Dropdown
              value={form.employee_id || null}
              options={employeeOptions}
              filter
              placeholder="Select employee"
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
            Lifecycle Type
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
            Effective Date
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
                  Proposed Employment
                </h2>
                <p className="m-0 mt-1 text-sm text-slate-500">
                  The current employment record remains unchanged until approval
                  and every required checklist task is completed.
                </p>
                {form.employee_id > 0 && isValidatingSelectedEmployment && (
                  <p className="m-0 mt-2 text-sm text-blue-700">
                    Loading the employee&apos;s current employment data...
                  </p>
                )}
                {form.employee_id > 0 &&
                  !isValidatingSelectedEmployment &&
                  !selectedEmployeeEmployment && (
                    <p className="m-0 mt-2 text-sm text-slate-600">
                      {selectedEmploymentError
                        ? "Current employment data is not available. You may still save this lifecycle as a draft with empty employment data."
                        : "This employee has no current employment record. The lifecycle can be saved as a draft with empty previous employment data; complete the proposed employment fields before submitting."}
                    </p>
                  )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Join Date
                  <Calendar
                    value={toCalendarDate(
                      selectedEmployeeEmployment?.join_date,
                    )}
                    appendTo={getBody}
                    dateFormat="dd-mm-yy"
                    showIcon
                    disabled
                    className="w-full"
                  />
                  <small className="font-normal text-slate-500">
                    Inherited from the current employment record and not changed
                    by Employment Change.
                  </small>
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Employee Code
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
                  Employment Status
                  <Dropdown
                    value={employmentChange.employment_status_id}
                    options={employmentStatuses.filter(
                      (item) => item.is_active !== false,
                    )}
                    optionLabel="name"
                    optionValue="id"
                    filter
                    placeholder="Select employment status"
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
                  Department
                  <Dropdown
                    value={employmentChange.department_id}
                    options={departments.filter(
                      (item) => item.is_active !== false,
                    )}
                    optionLabel="name"
                    optionValue="id"
                    filter
                    placeholder="Select department"
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
                  Position
                  <Dropdown
                    value={employmentChange.position_id}
                    options={positionOptions.filter(
                      (item) => item.is_active !== false,
                    )}
                    optionLabel="name"
                    optionValue="id"
                    filter
                    placeholder="Select position"
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
                  Agency
                  <Dropdown
                    value={employmentChange.agency_id}
                    options={agencies.filter(
                      (item) => item.is_active !== false,
                    )}
                    optionLabel="name"
                    optionValue="id"
                    showClear
                    filter
                    placeholder="Select agency"
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
                  Branch
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
                    placeholder="Select branch"
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
                  Direct Supervisor
                  <Dropdown
                    value={employmentChange.supervisor_employee_id}
                    options={approvalEmployeeOptions.filter(
                      (item) => item.value !== form.employee_id,
                    )}
                    showClear
                    filter
                    placeholder="Select supervisor"
                    emptyMessage="No employee + approver account found"
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
                  Employment End Date{" "}
                  <span className="font-normal text-slate-400">(optional)</span>
                  <Calendar
                    value={toCalendarDate(employmentChange.end_date)}
                    appendTo={getBody}
                    dateFormat="dd-mm-yy"
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
                  Probation End Date{" "}
                  <span className="font-normal text-slate-400">(optional)</span>
                  <Calendar
                    value={toCalendarDate(employmentChange.probation_end_date)}
                    appendTo={getBody}
                    dateFormat="dd-mm-yy"
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
                    Backdating is allowed for historical probation records.
                  </small>
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Confirmation Date{" "}
                  <span className="font-normal text-slate-400">(optional)</span>
                  <Calendar
                    value={toCalendarDate(employmentChange.confirmation_date)}
                    appendTo={getBody}
                    dateFormat="dd-mm-yy"
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
                    Backdating is allowed for historical confirmation records.
                  </small>
                </label>
              </div>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Employment Notes{" "}
                <span className="font-normal text-slate-400">(optional)</span>
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
            Reason{" "}
            <span className="font-normal text-slate-400">(optional)</span>
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
            ? `${selected.lifecycle_type.replace("_", " ")} - ${selected.employee_name}`
            : "Lifecycle Detail"
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
              label="Close"
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
              Effective date:{" "}
              <span className="font-medium text-slate-800">
                {detail.data.case.effective_date}
              </span>
              <span className="ml-4 text-slate-500">Lifecycle owner: </span>
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
              <Column field="name" header="Checklist task" />
              <Column
                header="Owner Policy"
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
                header="Assignee"
                body={(row: EmployeeLifecycleDetail["tasks"][number]) =>
                  employeeOptions.find(
                    (option) => option.value === row.assigned_employee_id,
                  )?.label ?? "Unassigned"
                }
              />
              <Column
                header="Due Date"
                body={(row: EmployeeLifecycleDetail["tasks"][number]) =>
                  row.due_date || "—"
                }
              />
              <Column
                header="Required"
                body={(row: EmployeeLifecycleDetail["tasks"][number]) =>
                  row.is_required ? "Yes" : "No"
                }
              />
              <Column
                header="Status"
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
                  header="Action"
                  body={(row: EmployeeLifecycleDetail["tasks"][number]) => (
                    <div className="flex gap-1">
                      <Button
                        label="Assign"
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
          <p className="text-sm text-slate-500">Loading detail...</p>
        )}
      </Dialog>
      <Dialog
        header={
          assignmentTask
            ? `Assign Task - ${assignmentTask.name}`
            : "Assign Checklist Task"
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
              label="Cancel"
              severity="secondary"
              outlined
              disabled={saving}
              onClick={() => setAssignmentTask(null)}
            />
            <Button
              label="Save Assignment"
              icon="pi pi-check"
              loading={saving}
              disabled={saving || detail.data?.case.status !== "DRAFT"}
              onClick={() => {
                if (!assignmentTask) return;
                requestActionConfirmation({
                  action: "Save task assignment",
                  target: assignmentTask.name,
                  severity: "info",
                  confirmLabel: "Save Assignment",
                  confirmIcon: "pi pi-check",
                  description: "Update this task assignment?",
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
            Task Owner
            <Dropdown
              value={taskAssignment.assignedEmployeeId}
              options={assignmentOptions}
              optionLabel="label"
              optionValue="value"
              filter
              showClear
              placeholder="Select employee"
              emptyMessage={
                assignmentTask?.assignment_source === "SUPERVISOR"
                  ? "No employee + approver account found"
                  : "No active employee found"
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
            Due Date{" "}
            <span className="font-normal text-slate-400">(optional)</span>
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
            The assigned employee receives a reminder up to three days before
            the due date.
          </p>
        </div>
      </Dialog>
    </>
  );
}
