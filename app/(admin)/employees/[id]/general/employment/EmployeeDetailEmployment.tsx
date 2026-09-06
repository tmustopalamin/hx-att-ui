"use client";
import { useI18n } from "@/app/i18n";

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
import EmployeeDetailTableHeader from "@/app/(admin)/employees/[id]/_components/EmployeeDetailTableHeader";
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
import { isWhitespaceFreeIdentifier } from "@/app/utils/identifier-validation";
import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";

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
  const { t: i18nT } = useI18n();
  const dispatch = useDispatch();
  const canUpdate = useSelector((state: RootState) =>
    state.profile.permissions.includes("employee.update"),
  );
  const params = useParams();
  const employeeId = Number(params.id);
  const employmentDataKey = `/api/employees/${employeeId}/employment-data`;
  const {
    data: employmentData,
    error: employmentError,
    isLoading: isLoadingEmployment,
    mutate: refreshEmploymentData,
  } = useSWR<EmployeeEmploymentData | null>(employmentDataKey, fetcher);

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
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
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
    setLoadError(null);

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
      const detail = getErrorMessage(err, "code");
      setLoadError(detail);

      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: i18nT("static.1vks92p"),
            detail,
          }),
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: i18nT("static.1vks92p"),
            detail,
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
    if (isSaving) {
      return;
    }

    if (!isWhitespaceFreeIdentifier(data.code)) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: i18nT("static.1vks92p"),
          detail: i18nT("validation.codeNoWhitespace"),
        }),
      );
      return;
    }
    if (
      data.supervisor_employee_id &&
      Number(data.supervisor_employee_id) === Number(employeeId)
    ) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: i18nT("static.1vks92p"),
          detail: i18nT("static.1215kan"),
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
      setIsSaving(true);
      await updateEmployeeEmploymentData(employeeId, payload);

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: i18nT("static.udvru8"),
          detail: i18nT("static.9l0b3z"),
        }),
      );

      setIsPageEdit(false);
      await refreshEmploymentData();
    } catch (err: unknown) {
      const detail = getErrorMessage(err, "code");

      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: i18nT("static.1vks92p"),
            detail,
          }),
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: i18nT("static.1vks92p"),
            detail,
          }),
        );
      } else {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: i18nT("static.1vks92p"),
            detail,
          }),
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (employmentError && employmentData === undefined) {
    return <ErrorNotConnectedToApi mutateKey={employmentDataKey} />;
  }

  if (isLoadingEmployment || loading) {
    return (
      <div className="py-8 text-sm text-slate-500">
        {i18nT("static.whl66l")}{" "}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <p className="m-0 text-sm font-semibold text-red-800">
          {i18nT("Unable to load employment options")}
        </p>
        <p className="m-0 mt-2 text-sm leading-6 text-red-700">{loadError}</p>
        <Button
          type="button"
          label={i18nT("static.28r6qc")}
          icon="pi pi-refresh"
          severity="danger"
          outlined
          className="mt-4"
          onClick={() => void loadData()}
        />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-5">
        <EmployeeDetailTableHeader
          title={i18nT("static.mirjw9")}
          description={
            hasEmploymentHistory
              ? i18nT("static.e2b8sp")
              : i18nT("static.joi3d")
          }
          actions={
            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
              {isPageEdit ? (
                <>
                  <Button
                    type="button"
                    label={i18nT("static.ew9em3")}
                    icon="pi pi-times"
                    text
                    severity="secondary"
                    size="small"
                    className="w-full sm:w-auto"
                    disabled={isSaving}
                    onClick={() => {
                      setIsPageEdit(false);
                      void loadData();
                    }}
                  />
                  <Button
                    type="submit"
                    label={i18nT("static.6gmm1l")}
                    icon="pi pi-check"
                    size="small"
                    className="w-full sm:w-auto"
                    loading={isSaving}
                    disabled={isSaving}
                  />
                </>
              ) : hasEmploymentHistory ? (
                <Link
                  href={`/employee-lifecycle?employee_id=${employeeId}&type=EMPLOYMENT_CHANGE`}
                  className="w-full sm:w-auto"
                >
                  <Button
                    type="button"
                    label={i18nT("static.14hifi8")}
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
                  label={i18nT("static.1i1lcq9")}
                  icon="pi pi-pencil"
                  severity="secondary"
                  outlined
                  size="small"
                  className="w-full sm:w-auto"
                  onClick={() => setIsPageEdit(true)}
                />
              ) : null}
            </div>
          }
        />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Controller
            name="code"
            control={control}
            render={({ field }) => (
              <div>
                <label htmlFor="employment_code" className={fieldLabelClass}>
                  {i18nT("static.ncb762")}{" "}
                </label>
                <InputText
                  id="employment_code"
                  {...field}
                  disabled={!isPageEdit}
                  className="w-full"
                  placeholder={i18nT("static.6fmays")}
                />
              </div>
            )}
          />

          <Controller
            name="employment_status_id"
            control={control}
            rules={{ required: i18nT("static.mbr0u") }}
            render={({ field, fieldState }) => (
              <div>
                <label
                  htmlFor="employment_status_id"
                  className={fieldLabelClass}
                >
                  {i18nT("static.p2ngjv")}{" "}
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
                  placeholder={i18nT("static.loo409")}
                  className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                />
                {fieldState.error && (
                  <small className="p-error">{fieldState.error.message}</small>
                )}
                {field.value && (
                  <small className="mt-1 block text-slate-500">
                    {i18nT("static.g14cjo")}{" "}
                    {employmentStatuses.find(
                      (status) => Number(status.id) === Number(field.value),
                    )?.default_tax_employee_type ?? i18nT("static.4tqh3i")}
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
                  {i18nT("static.1v3zejm")}{" "}
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
                  placeholder={i18nT("static.1aklnvk")}
                  className="w-full"
                  showClear
                  filter
                />
                <small className="text-slate-500">
                  {i18nT("static.1ba84v1")}{" "}
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
                  {i18nT("static.19gzx45")}{" "}
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
                    selectedAgencyId
                      ? i18nT("static.17q9myv")
                      : i18nT("static.1dacy3y")
                  }
                  className="w-full"
                  showClear
                  filter
                />
                <small className="text-slate-500">
                  {i18nT("static.1ez84u9")}{" "}
                </small>
              </div>
            )}
          />

          <Controller
            name="department_id"
            control={control}
            rules={{ required: i18nT("static.2o8agq") }}
            render={({ field, fieldState }) => (
              <div>
                <label htmlFor="department_id" className={fieldLabelClass}>
                  {i18nT("static.1430r53")}{" "}
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
                  placeholder={i18nT("static.sln621")}
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
            rules={{ required: i18nT("static.1y306v3") }}
            render={({ field, fieldState }) => (
              <div>
                <label htmlFor="position_id" className={fieldLabelClass}>
                  {i18nT("static.1quewx6")}{" "}
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
                  placeholder={i18nT("static.1e100xw")}
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
                  {i18nT("static.1k7tusw")}{" "}
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
                  placeholder={i18nT("static.xhzk5d")}
                  emptyMessage={i18nT("static.1j4mgrb")}
                  className="w-full"
                  showClear
                  filter
                />
                <small className="text-slate-500">
                  {i18nT("static.1c4u8uv")}{" "}
                </small>
              </div>
            )}
          />

          <Controller
            name="join_date"
            control={control}
            rules={{ required: i18nT("static.3tb0xu") }}
            render={({ field, fieldState }) => (
              <div>
                <label htmlFor="join_date" className={fieldLabelClass}>
                  {i18nT("static.136fqhb")}{" "}
                </label>
                <Calendar
                  id="join_date"
                  appendTo={getBody}
                  disabled={!isPageEdit}
                  dateFormat="dd MM yy"
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
                  {i18nT("static.1j4m31m")}{" "}
                </label>
                <Calendar
                  id="end_date"
                  appendTo={getBody}
                  disabled={!isPageEdit}
                  dateFormat="dd MM yy"
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
                  {i18nT("static.1ignfpe")}{" "}
                </label>
                <Calendar
                  id="probation_end_date"
                  appendTo={getBody}
                  disabled={!isPageEdit}
                  dateFormat="dd MM yy"
                  showIcon
                  value={field.value}
                  onChange={(e) => field.onChange(e.value)}
                  className="w-full"
                />
                <small className="text-slate-500">
                  {i18nT("static.befwhu")}{" "}
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
                  {i18nT("static.404n94")}{" "}
                </label>
                <Calendar
                  id="confirmation_date"
                  appendTo={getBody}
                  disabled={!isPageEdit}
                  dateFormat="dd MM yy"
                  showIcon
                  value={field.value}
                  onChange={(e) => field.onChange(e.value)}
                  className="w-full"
                />
                <small className="text-slate-500">
                  {i18nT("static.o99315")}{" "}
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
