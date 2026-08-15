"use client";

import {
  getAgencyOptions,
  getBranchOptions,
  getDepartmentOptions,
  getApprovalEmployeeOptions,
  getEmploymentStatusOptions,
  getPositionOptions,
  updateEmployeeEmploymentData,
} from "@/app/services/employee-general-service";
import {
  EmployeeEmploymentData,
  OptionItem,
  EmploymentStatusOption,
} from "@/app/types/employee-general";
import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { showToast } from "@/store/ToastSlice";
import dayjs from "dayjs";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import React, { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/store";
import useSWR from "swr";
import { fetcher } from "@/app/utils/fetcher";

type PositionOption = OptionItem & {
  department_id?: number | null;
};

type BranchOption = OptionItem & {
  agency_id?: number | null;
};

type EmployeeOption = OptionItem & {
  is_active?: boolean;
};

type FormData = {
  code: string;
  agency_id: number | null;
  branch_id: number | null;
  department_id: number | null;
  position_id: number | null;
  employment_status_id: number | null;
  supervisor_employee_id: number | null;
  join_date: Date | null;
  end_date: Date | null;
  probation_end_date: Date | null;
  confirmation_date: Date | null;
};

const getBody = () => document.body;

const fieldLabelClass = "mb-2 block text-sm font-medium text-slate-700";

const EmployeeDetailEmployment = () => {
  const dispatch = useDispatch();
  const canUpdate = useSelector((state: RootState) =>
    state.profile.permissions.includes("employee.update"),
  );
  const params = useParams();
  const employeeId = Number(params.id);
  const employmentDataKey = `/api/employees/${employeeId}/employment-data`;
  const { data: employmentData, mutate: refreshEmploymentData } =
    useSWR<EmployeeEmploymentData | null>(employmentDataKey, fetcher);

  const { control, handleSubmit, reset, setValue } = useForm<FormData>({
    defaultValues: {
      code: "",
      agency_id: null,
      branch_id: null,
      department_id: null,
      position_id: null,
      employment_status_id: null,
      supervisor_employee_id: null,
      join_date: null,
      end_date: null,
      probation_end_date: null,
      confirmation_date: null,
    },
  });

  const [isPageEdit, setIsPageEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const hasEmploymentHistory = employmentData !== null;

  const [departments, setDepartments] = useState<OptionItem[]>([]);
  const [positions, setPositions] = useState<PositionOption[]>([]);
  const [employmentStatuses, setEmploymentStatuses] = useState<
    EmploymentStatusOption[]
  >([]);
  const [agencies, setAgencies] = useState<OptionItem[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);

  const selectedDepartmentId = useWatch({
    control,
    name: "department_id",
  });

  const selectedAgencyId = useWatch({
    control,
    name: "agency_id",
  });

  const selectedBranchId = useWatch({
    control,
    name: "branch_id",
  });

  const positionOptions = useMemo(() => {
    if (!selectedDepartmentId) {
      return positions;
    }

    return positions.filter(
      (position) =>
        !position.department_id ||
        Number(position.department_id) === Number(selectedDepartmentId),
    );
  }, [positions, selectedDepartmentId]);

  const branchOptions = useMemo(() => {
    if (!selectedAgencyId) {
      return [];
    }

    return branches.filter(
      (branch) =>
        !branch.agency_id ||
        Number(branch.agency_id) === Number(selectedAgencyId),
    );
  }, [branches, selectedAgencyId]);

  const supervisorOptions = useMemo(() => {
    return employees
      .filter((employee) => Number(employee.id) !== Number(employeeId))
      .filter((employee) => employee.is_active !== false);
  }, [employees, employeeId]);

  useEffect(() => {
    if (!selectedAgencyId && selectedBranchId) {
      setValue("branch_id", null);
      return;
    }

    if (
      selectedAgencyId &&
      selectedBranchId &&
      !branchOptions.some(
        (branch) => Number(branch.id) === Number(selectedBranchId),
      )
    ) {
      setValue("branch_id", null);
    }
  }, [selectedAgencyId, selectedBranchId, branchOptions, setValue]);

  const loadData = async () => {
    if (employmentData === undefined) {
      return;
    }

    setLoading(true);

    try {
      const [
        departmentList,
        positionList,
        employmentStatusList,
        agencyList,
        branchList,
        employeeList,
      ] = await Promise.all([
        getDepartmentOptions(),
        getPositionOptions(),
        getEmploymentStatusOptions(),
        getAgencyOptions(),
        getBranchOptions(),
        getApprovalEmployeeOptions(),
      ]);

      setDepartments(departmentList);
      setPositions(positionList.filter((item) => item.is_active !== false));
      setEmploymentStatuses(
        employmentStatusList.filter((item) => item.is_active !== false),
      );
      setAgencies(agencyList);
      setBranches(branchList);
      setEmployees(employeeList);

      if (employmentData) {
        reset({
          code: employmentData.code ?? "",
          agency_id: employmentData.agency_id ?? null,
          branch_id: employmentData.branch_id ?? null,
          department_id: employmentData.department_id ?? null,
          position_id: employmentData.position_id ?? null,
          employment_status_id: employmentData.employment_status_id ?? null,
          supervisor_employee_id: employmentData.supervisor_employee_id ?? null,
          join_date: employmentData.join_date
            ? dayjs(employmentData.join_date).toDate()
            : null,
          end_date: employmentData.end_date
            ? dayjs(employmentData.end_date).toDate()
            : null,
          probation_end_date: employmentData.probation_end_date
            ? dayjs(employmentData.probation_end_date).toDate()
            : null,
          confirmation_date: employmentData.confirmation_date
            ? dayjs(employmentData.confirmation_date).toDate()
            : null,
        });
      } else {
        reset({
          code: "",
          agency_id: null,
          branch_id: null,
          department_id: null,
          position_id: null,
          employment_status_id: null,
          supervisor_employee_id: null,
          join_date: null,
          end_date: null,
          probation_end_date: null,
          confirmation_date: null,
        });
      }
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: getErrorMessage(err, "message"),
          }),
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: err.message,
          }),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!employeeId || Number.isNaN(employeeId)) {
      return;
    }

    void loadData();
  }, [employeeId, employmentData]);

  const onSubmit = async (data: FormData) => {
    if (
      data.supervisor_employee_id &&
      Number(data.supervisor_employee_id) === Number(employeeId)
    ) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Error",
          detail: "Supervisor cannot be the same as the employee.",
        }),
      );
      return;
    }

    const payload: EmployeeEmploymentData = {
      employee_id: employeeId,
      code: data.code.trim() || null,
      join_date: data.join_date
        ? dayjs(data.join_date).format("YYYY-MM-DD")
        : "",
      end_date: data.end_date
        ? dayjs(data.end_date).format("YYYY-MM-DD")
        : null,
      probation_end_date: data.probation_end_date
        ? dayjs(data.probation_end_date).format("YYYY-MM-DD")
        : null,
      confirmation_date: data.confirmation_date
        ? dayjs(data.confirmation_date).format("YYYY-MM-DD")
        : null,
      department_id: Number(data.department_id),
      position_id: Number(data.position_id),
      employment_status_id: Number(data.employment_status_id),
      supervisor_employee_id: data.supervisor_employee_id
        ? Number(data.supervisor_employee_id)
        : null,
      agency_id: data.agency_id ? Number(data.agency_id) : null,
      branch_id: data.branch_id ? Number(data.branch_id) : null,
    };

    try {
      await updateEmployeeEmploymentData(employeeId, payload);

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: "Employment data updated successfully.",
        }),
      );

      setIsPageEdit(false);
      await refreshEmploymentData();
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: getErrorMessage(err, "message"),
          }),
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: err.message,
          }),
        );
      }
    }
  };

  if (loading) {
    return (
      <div className="py-8 text-sm text-slate-500">
        Loading employment data...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h5 className="text-xl font-semibold text-slate-900">
              Employment Data
            </h5>
            <p className="mt-1 text-sm text-slate-500">
              {hasEmploymentHistory
                ? "Employment changes are effective-dated and must be processed through Employee Lifecycle to preserve history."
                : "Set the initial employment assignment, organization placement, and direct supervisor."}
            </p>
          </div>

          <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
            {isPageEdit ? (
              <>
                <Button
                  type="button"
                  label="Cancel"
                  icon="pi pi-times"
                  text
                  severity="secondary"
                  size="small"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setIsPageEdit(false);
                    void loadData();
                  }}
                />
                <Button
                  type="submit"
                  label="Save Changes"
                  icon="pi pi-check"
                  size="small"
                  className="w-full sm:w-auto"
                />
              </>
            ) : hasEmploymentHistory ? (
              <Link
                href={`/employee-lifecycle?employee_id=${employeeId}&type=EMPLOYMENT_CHANGE`}
                className="w-full sm:w-auto"
              >
                <Button
                  type="button"
                  label="Request Employment Change"
                  icon="pi pi-send"
                  severity="secondary"
                  outlined
                  size="small"
                  className="w-full sm:w-auto"
                />
              </Link>
            ) : canUpdate ? (
              <Button
                type="button"
                label="Edit"
                icon="pi pi-pencil"
                severity="secondary"
                outlined
                size="small"
                className="w-full sm:w-auto"
                onClick={() => setIsPageEdit(true)}
              />
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Controller
            name="code"
            control={control}
            render={({ field }) => (
              <div>
                <label htmlFor="employment_code" className={fieldLabelClass}>
                  Employee Code
                </label>
                <InputText
                  id="employment_code"
                  {...field}
                  disabled={!isPageEdit}
                  className="w-full"
                  placeholder="Enter employee code"
                />
              </div>
            )}
          />

          <Controller
            name="employment_status_id"
            control={control}
            rules={{ required: "Employment status is required" }}
            render={({ field, fieldState }) => (
              <div>
                <label
                  htmlFor="employment_status_id"
                  className={fieldLabelClass}
                >
                  Employment Status
                </label>
                <Dropdown
                  id="employment_status_id"
                  appendTo={getBody}
                  disabled={!isPageEdit}
                  value={field.value}
                  options={employmentStatuses}
                  onChange={(e) => field.onChange(e.value)}
                  optionLabel="name"
                  optionValue="id"
                  placeholder="Select employment status"
                  className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                />
                {fieldState.error && (
                  <small className="p-error">{fieldState.error.message}</small>
                )}
                {field.value && (
                  <small className="mt-1 block text-slate-500">
                    Tax treatment:{" "}
                    {employmentStatuses.find(
                      (status) => Number(status.id) === Number(field.value),
                    )?.default_tax_employee_type ?? "Not configured"}
                  </small>
                )}
              </div>
            )}
          />

          <Controller
            name="agency_id"
            control={control}
            render={({ field }) => (
              <div>
                <label htmlFor="agency_id" className={fieldLabelClass}>
                  Agency
                </label>
                <Dropdown
                  id="agency_id"
                  appendTo={getBody}
                  disabled={!isPageEdit}
                  value={field.value}
                  options={agencies}
                  onChange={(e) => field.onChange(e.value)}
                  optionLabel="name"
                  optionValue="id"
                  placeholder="Select agency"
                  className="w-full"
                  showClear
                  filter
                />
                <small className="text-slate-500">
                  Select legal entity / employing company first.
                </small>
              </div>
            )}
          />

          <Controller
            name="branch_id"
            control={control}
            render={({ field }) => (
              <div>
                <label htmlFor="branch_id" className={fieldLabelClass}>
                  Branch
                </label>
                <Dropdown
                  id="branch_id"
                  appendTo={getBody}
                  disabled={!isPageEdit || !selectedAgencyId}
                  value={field.value}
                  options={branchOptions}
                  onChange={(e) => field.onChange(e.value)}
                  optionLabel="name"
                  optionValue="id"
                  placeholder={
                    selectedAgencyId ? "Select branch" : "Select agency first"
                  }
                  className="w-full"
                  showClear
                  filter
                />
                <small className="text-slate-500">
                  Branch list is filtered by selected agency.
                </small>
              </div>
            )}
          />

          <Controller
            name="department_id"
            control={control}
            rules={{ required: "Department is required" }}
            render={({ field, fieldState }) => (
              <div>
                <label htmlFor="department_id" className={fieldLabelClass}>
                  Department
                </label>
                <Dropdown
                  id="department_id"
                  appendTo={getBody}
                  disabled={!isPageEdit}
                  value={field.value}
                  options={departments}
                  onChange={(e) => field.onChange(e.value)}
                  optionLabel="name"
                  optionValue="id"
                  placeholder="Select department"
                  className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                  filter
                />
                {fieldState.error && (
                  <small className="p-error">{fieldState.error.message}</small>
                )}
              </div>
            )}
          />

          <Controller
            name="position_id"
            control={control}
            rules={{ required: "Position is required" }}
            render={({ field, fieldState }) => (
              <div>
                <label htmlFor="position_id" className={fieldLabelClass}>
                  Position
                </label>
                <Dropdown
                  id="position_id"
                  appendTo={getBody}
                  disabled={!isPageEdit}
                  value={field.value}
                  options={positionOptions}
                  onChange={(e) => field.onChange(e.value)}
                  optionLabel="name"
                  optionValue="id"
                  placeholder="Select position"
                  className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                  filter
                />
                {fieldState.error && (
                  <small className="p-error">{fieldState.error.message}</small>
                )}
              </div>
            )}
          />

          <Controller
            name="supervisor_employee_id"
            control={control}
            render={({ field }) => (
              <div>
                <label
                  htmlFor="supervisor_employee_id"
                  className={fieldLabelClass}
                >
                  Supervisor / Direct Manager
                </label>
                <Dropdown
                  id="supervisor_employee_id"
                  appendTo={getBody}
                  disabled={!isPageEdit}
                  value={field.value}
                  options={supervisorOptions}
                  onChange={(e) => field.onChange(e.value)}
                  optionLabel="name"
                  optionValue="id"
                  placeholder="Select supervisor"
                  emptyMessage="No employee + approver account found"
                  className="w-full"
                  showClear
                  filter
                />
                <small className="text-slate-500">
                  Used by approval engine to route leave and overtime requests.
                </small>
              </div>
            )}
          />

          <Controller
            name="join_date"
            control={control}
            rules={{ required: "Join date is required" }}
            render={({ field, fieldState }) => (
              <div>
                <label htmlFor="join_date" className={fieldLabelClass}>
                  Join Date
                </label>
                <Calendar
                  id="join_date"
                  appendTo={getBody}
                  disabled={!isPageEdit}
                  dateFormat="dd-mm-yy"
                  showIcon
                  value={field.value}
                  onChange={(e) => field.onChange(e.value)}
                  className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                />
                {fieldState.error && (
                  <small className="p-error">{fieldState.error.message}</small>
                )}
              </div>
            )}
          />

          <Controller
            name="end_date"
            control={control}
            render={({ field }) => (
              <div>
                <label htmlFor="end_date" className={fieldLabelClass}>
                  End Date
                </label>
                <Calendar
                  id="end_date"
                  appendTo={getBody}
                  disabled={!isPageEdit}
                  dateFormat="dd-mm-yy"
                  showIcon
                  value={field.value}
                  onChange={(e) => field.onChange(e.value)}
                  className="w-full"
                />
              </div>
            )}
          />

          <Controller
            name="probation_end_date"
            control={control}
            render={({ field }) => (
              <div>
                <label htmlFor="probation_end_date" className={fieldLabelClass}>
                  Probation End Date
                </label>
                <Calendar
                  id="probation_end_date"
                  appendTo={getBody}
                  disabled={!isPageEdit}
                  dateFormat="dd-mm-yy"
                  showIcon
                  value={field.value}
                  onChange={(e) => field.onChange(e.value)}
                  className="w-full"
                />
                <small className="text-slate-500">
                  Last day of the probation period.
                </small>
              </div>
            )}
          />

          <Controller
            name="confirmation_date"
            control={control}
            render={({ field }) => (
              <div>
                <label htmlFor="confirmation_date" className={fieldLabelClass}>
                  Confirmation Date
                </label>
                <Calendar
                  id="confirmation_date"
                  appendTo={getBody}
                  disabled={!isPageEdit}
                  dateFormat="dd-mm-yy"
                  showIcon
                  value={field.value}
                  onChange={(e) => field.onChange(e.value)}
                  className="w-full"
                />
                <small className="text-slate-500">
                  Date the employee is formally confirmed after probation.
                </small>
              </div>
            )}
          />
        </div>
      </div>
    </form>
  );
};

export default EmployeeDetailEmployment;
