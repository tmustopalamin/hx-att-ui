"use client";
import { useI18n } from "@/app/i18n";

import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Controller, useForm } from "react-hook-form";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/app/utils/fetcher";
import {
  ResponseType,
  ResponseTypeCreateSuccess,
} from "@/app/types/response-type";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import {
  isResponseTypeError,
  getErrorMessage,
} from "@/app/utils/error-messages";
import { useArchivedDataAccess } from "@/app/utils/archived-data-access";
import { showToast } from "@/store/ToastSlice";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { InputNumber } from "primereact/inputnumber";
import { InputTextarea } from "primereact/inputtextarea";
import { EmployeePersonalData } from "@/app/types/employee-general";
import { EmployeeIncomeComponent } from "@/app/types/employee-income-component";
import { useParams } from "next/navigation";
import dayjs from "dayjs";
import {
  createEmployeeIncomeComponent,
  updateEmployeeIncomeComponent,
  deleteEmployeeIncomeComponent,
  purgeEmployeeIncomeComponent,
  restoreEmployeeIncomeComponent,
} from "@/app/services/employee-income-component-service";
import { InputSwitch } from "primereact/inputswitch";
import { Tag } from "primereact/tag";
import { Frequency } from "@/app/types/frequency";
import { IncomeComponent } from "@/app/types/income-component";
import { useDirtyFormGuard } from "@/app/_components/useDirtyFormGuard";
import EmployeeDetailTableHeader from "@/app/(admin)/employees/[id]/_components/EmployeeDetailTableHeader";
import {
  formatPayrollCurrency,
  formatPayrollDate,
  formatPayrollPercentage,
} from "@/app/(admin)/employees/[id]/payroll/_components/payroll-display-formatters";

const EmployeePayrollEmployeeIncomeComponentTableData = () => {
  const { t: i18nT } = useI18n();
  const params = useParams();
  const id = params.id;

  const dispatch = useDispatch();
  const profileState = useSelector((state: RootState) => state.profile);
  const archivedAccess = useArchivedDataAccess("payroll");
  const permissionSet = new Set(profileState.permissions);
  const canCreate = permissionSet.has("payroll.create");
  const canUpdate = permissionSet.has("payroll.update");
  const canDelete = permissionSet.has("payroll.delete");
  const canRestore = archivedAccess.canRestore;
  const canPurge = archivedAccess.canPurge;
  const [selectedData, setSelectedData] =
    useState<EmployeeIncomeComponent | null>(null);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState({
    global: { value: "", matchMode: FilterMatchMode.CONTAINS },
  });
  const [selectedIncomeComponent, setSelectedIncomeComponent] =
    useState<IncomeComponent | null>(null);
  const [isAddNew, setIsAddNew] = useState(false);
  const [visible, setVisible] = useState(false);
  const [popupHeaderTitle, setPopupHeaderTitle] = useState("");
  const {
    control,
    handleSubmit,
    setFocus,
    formState: { isDirty, isSubmitting },
    reset,
    clearErrors,
    setValue,
  } = useForm<EmployeeIncomeComponent>();
  const { confirmDiscard } = useDirtyFormGuard(
    visible && isDirty,
    !isSubmitting,
  );
  const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] =
    useState(false);

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const _filters = { ...filters };

    _filters["global"].value = value;

    setFilters(_filters);
    setGlobalFilterValue(value);
  };

  const onClickNew = () => {
    clearErrors();
    setSelectedIncomeComponent(null);
    setIsAddNew(true);
    setVisible(true);
    setPopupHeaderTitle("New Income Component");
    reset({
      id: 0,
      employee_id: Number(id),
      income_component_master_id: 0,
      based_on_component_id: null,
      amount: 0,
      frequency: null,
      start_date: null,
      end_date: null,
      is_active: true,
      notes: "",
      deleted_at: "",
      row_version: 0,
    });
  };

  const closeForm = () => {
    if (isSubmitting) return;
    if (!isDirty) {
      setVisible(false);
      reset();
      return;
    }

    void confirmDiscard().then((discard) => {
      if (discard) {
        setVisible(false);
        reset();
      }
    });
  };

  const footerContent = (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
      <Button
        type="button"
        label={i18nT("static.ew9em3")}
        icon="pi pi-times"
        text
        severity="secondary"
        disabled={isSubmitting}
        className="w-full sm:w-auto"
        onClick={closeForm}
      />
      <Button
        type="submit"
        form="employee-income-component-form"
        label={isAddNew ? i18nT("static.1qwrmmb") : i18nT("static.6gmm1l")}
        icon="pi pi-check"
        loading={isSubmitting}
        disabled={isSubmitting}
        className="w-full sm:w-auto"
      />
    </div>
  );

  const {
    data: EmployeeIncomeComponentData,
    error,
    isLoading,
    isValidating,
  } = useSWR<EmployeeIncomeComponent[]>(
    `/api/employees/${id}/income-component?show_all=${
      archivedAccess.canShowDeleted && isShowDeletedDataChecked
    }`,
    fetcher,
  );
  const {
    data: employeeData,
    error: employeeError,
    isLoading: employeeIsLoading,
  } = useSWR<EmployeePersonalData>(
    `/api/employees/${id}/personal-data`,
    fetcher,
  );
  const {
    data: incomeComponentData,
    error: incomeComponentError,
    isLoading: incomeComponentIsLoading,
  } = useSWR<IncomeComponent[]>(`/api/income-component`, fetcher);
  const {
    data: frequencyData,
    error: errorFrequency,
    isLoading: isLoadingFrequency,
  } = useSWR<Frequency[]>(`/api/frequency`, fetcher);
  const employeeIncomeComponentActive = incomeComponentData?.filter(
    (a) => a.is_active && a.assignment_mode === "EMPLOYEE",
  );
  const incomeComponentReferenceOptions = incomeComponentData?.filter(
    (a) =>
      a.is_active &&
      (a.assignment_mode === "EMPLOYEE" ||
        (a.assignment_mode === "SYSTEM" &&
          a.code?.toUpperCase() === "BASIC_SALARY")),
  );
  const employeeActive = employeeData
    ? [
        {
          id: Number(id),
          full_name: [
            employeeData.first_name,
            employeeData.middle_name,
            employeeData.last_name,
          ]
            .filter(Boolean)
            .join(" "),
        },
      ]
    : [];
  const activeFrequency = frequencyData?.filter((a) => a.is_active);

  useEffect(() => {
    if (
      selectedIncomeComponent?.calculation_method_code?.toUpperCase() !==
      "WORKING_PERIOD"
    ) {
      return;
    }
    const monthlyFrequency = frequencyData?.find(
      (frequency) =>
        frequency.is_active &&
        !frequency.deleted_at &&
        frequency.code.toUpperCase() === "MONTHLY",
    );
    if (monthlyFrequency) {
      setValue("frequency", monthlyFrequency.id, { shouldDirty: false });
    }
  }, [frequencyData, selectedIncomeComponent, setValue]);

  if (isLoading) return <LoadingDataTable />;
  if (error) {
    return (
      <ErrorNotConnectedToApi
        mutateKey={`/api/employees/${id}/income-component?show_all=${archivedAccess.canShowDeleted && isShowDeletedDataChecked}`}
      />
    );
  }

  const onIngredientsChange = () => {
    setIsShowDeletedDataChecked(!isShowDeletedDataChecked);
  };

  const handleSubmitNew = async (data: EmployeeIncomeComponent) => {
    try {
      const dataToSave =
        selectedIncomeComponent?.calculation_method_code?.toUpperCase() ===
        "WORKING_PERIOD"
          ? {
              ...data,
              amount: 0,
              percentage: null,
              based_on_component_id: null,
              frequency:
                activeFrequency?.find(
                  (frequency) =>
                    frequency.is_active &&
                    !frequency.deleted_at &&
                    frequency.code.toUpperCase() === "MONTHLY",
                )?.id ?? data.frequency,
            }
          : data;
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await createEmployeeIncomeComponent({
          ...dataToSave,
          employee_id: Number(id),
        });
      setVisible(false);
      reset();
      await mutate(
        `/api/employees/${id}/income-component?show_all=${archivedAccess.canShowDeleted && isShowDeletedDataChecked}`,
      );
      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: i18nT("static.g72xw0"),
          detail: res.message,
        }),
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: i18nT("static.9bb0pd"),
            detail: getErrorMessage(err, "message"),
          }),
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: i18nT("static.9bb0pd"),
            detail: err.message,
          }),
        );
      }
    }
  };

  const handleUpdate = async (data: EmployeeIncomeComponent) => {
    if (!selectedData) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: i18nT("static.9bb0pd"),
          detail: i18nT("static.yiy5uj"),
        }),
      );
      return;
    }

    try {
      const dataToSave =
        selectedIncomeComponent?.calculation_method_code?.toUpperCase() ===
        "WORKING_PERIOD"
          ? {
              ...data,
              amount: 0,
              percentage: null,
              based_on_component_id: null,
              frequency:
                activeFrequency?.find(
                  (frequency) =>
                    frequency.is_active &&
                    !frequency.deleted_at &&
                    frequency.code.toUpperCase() === "MONTHLY",
                )?.id ?? data.frequency,
            }
          : data;
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await updateEmployeeIncomeComponent(
          selectedData.id,
          selectedData.row_version,
          dataToSave,
        );

      setVisible(false);
      await mutate(
        `/api/employees/${id}/income-component?show_all=${archivedAccess.canShowDeleted && isShowDeletedDataChecked}`,
      );
      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: i18nT("static.g72xw0"),
          detail: res.message,
        }),
      );
      reset();
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: i18nT("static.9bb0pd"),
            detail: getErrorMessage(err, "message"),
          }),
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: i18nT("static.9bb0pd"),
            detail: err.message,
          }),
        );
      }
    }
  };

  const handleDelete = async (data: EmployeeIncomeComponent) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await deleteEmployeeIncomeComponent(data.id, data);
      setVisible(false);
      reset();
      await mutate(
        `/api/employees/${id}/income-component?show_all=${archivedAccess.canShowDeleted && isShowDeletedDataChecked}`,
      );

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: i18nT("static.g72xw0"),
          detail: res.message,
        }),
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: i18nT("static.9bb0pd"),
            detail: getErrorMessage(err, "message"),
          }),
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: i18nT("static.9bb0pd"),
            detail: err.message,
          }),
        );
      }
    }
  };

  const handlePurge = async (data: EmployeeIncomeComponent) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await purgeEmployeeIncomeComponent(data.id, data);
      setVisible(false);
      reset();
      await mutate(
        `/api/employees/${id}/income-component?show_all=${archivedAccess.canShowDeleted && isShowDeletedDataChecked}`,
      );

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: i18nT("static.g72xw0"),
          detail: res.message,
        }),
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: i18nT("static.9bb0pd"),
            detail: getErrorMessage(err, "message"),
          }),
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: i18nT("static.9bb0pd"),
            detail: err.message,
          }),
        );
      }
    }
  };

  const handleRestore = async (data: EmployeeIncomeComponent) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await restoreEmployeeIncomeComponent(data.id, data);
      setVisible(false);
      reset();
      await mutate(
        `/api/employees/${id}/income-component?show_all=${archivedAccess.canShowDeleted && isShowDeletedDataChecked}`,
      );

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: i18nT("static.g72xw0"),
          detail: res.message,
        }),
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: i18nT("static.9bb0pd"),
            detail: getErrorMessage(err, "message"),
          }),
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: i18nT("static.9bb0pd"),
            detail: err.message,
          }),
        );
      }
    }
  };

  const onSubmit = async (data: EmployeeIncomeComponent) => {
    if (isAddNew) {
      await handleSubmitNew(data);
      return;
    }

    if (selectedData) {
      await handleUpdate(data);
    }
  };

  const onClickUpdate = (data: EmployeeIncomeComponent) => {
    setVisible(true);
    setIsAddNew(false);
    setPopupHeaderTitle("Update Income Component");

    const updatedData = {
      ...data,
      start_date: data.start_date ? dayjs(data.start_date).toDate() : null,
      end_date: data.end_date ? dayjs(data.end_date).toDate() : null,
    };

    reset(updatedData);
    setSelectedData(updatedData);
    setSelectedIncomeComponent(
      incomeComponentData?.find(
        (component) => component.id === data.income_component_master_id,
      ) ?? null,
    );
  };

  const activeColumnBody = (rowData: EmployeeIncomeComponent) => {
    return rowData.is_active ? (
      <Tag
        value={i18nT("static.8qzyhb")}
        severity="success"
        icon="pi pi-check-circle"
        rounded
      />
    ) : (
      <Tag
        value={i18nT("static.13zf5vc")}
        severity="warning"
        icon="pi pi-minus-circle"
        rounded
      />
    );
  };

  const actionColumnBody = (rowData: EmployeeIncomeComponent) => {
    return (
      <>
        <div className="flex flex-nowrap items-center justify-end gap-2">
          {canPurge && rowData.deleted_at && (
            <Button
              type="button"
              tooltipOptions={{
                appendTo: () => document.body,
                position: "top",
              }}
              tooltip={i18nT("static.1ny6sg3")}
              rounded
              outlined
              severity="danger"
              icon="pi pi-trash"
              size="small"
              aria-label={i18nT("static.v2e1hf")}
              onClick={() => {
                onClickPurge(rowData);
              }}
            />
          )}

          {canRestore && rowData.deleted_at && (
            <Button
              type="button"
              tooltipOptions={{
                appendTo: () => document.body,
                position: "top",
              }}
              tooltip={i18nT("static.1p9rz69")}
              rounded
              outlined
              severity="success"
              icon="pi pi-refresh"
              size="small"
              aria-label={i18nT("static.r915sn")}
              onClick={() => {
                onClickRestore(rowData);
              }}
            />
          )}

          {canDelete && !rowData.deleted_at && (
            <Button
              type="button"
              tooltipOptions={{
                appendTo: () => document.body,
                position: "top",
              }}
              tooltip={i18nT("static.ssf22y")}
              rounded
              outlined
              severity="danger"
              icon="pi pi-trash"
              size="small"
              aria-label={i18nT("static.12y5mne")}
              onClick={() => {
                onClickDelete(rowData);
              }}
            />
          )}

          {canUpdate && !rowData.deleted_at && (
            <Button
              type="button"
              tooltipOptions={{
                appendTo: () => document.body,
                position: "top",
              }}
              tooltip={i18nT("static.b45n5g")}
              rounded
              outlined
              severity="secondary"
              icon="pi pi-pencil"
              size="small"
              aria-label={i18nT("static.5h4puf")}
              onClick={() => {
                onClickUpdate(rowData);
              }}
            />
          )}
        </div>
      </>
    );
  };

  const onClickDelete = (data: EmployeeIncomeComponent) => {
    requestActionConfirmation({
      message: i18nT("static.bn1ao7"),
      header: i18nT("static.14tdkvz"),
      icon: "pi pi-info-circle",
      defaultFocus: "accept",
      accept: () => {
        setSelectedData(data);
        handleDelete(data);
      },
      reject: () => {},
      footer: (options) => (
        <div className="flex gap-3 justify-end">
          <Button
            label={i18nT("static.r5wqai")}
            icon="pi pi-times"
            onClick={options.reject}
            className="p-button-text"
          />
          <Button
            label={i18nT("static.1dudzcg")}
            icon="pi pi-check"
            onClick={options.accept}
            className="p-button-danger"
          />
        </div>
      ),
    });
  };

  const onClickRestore = (data: EmployeeIncomeComponent) => {
    requestActionConfirmation({
      message: i18nT("static.c06jc4"),
      header: i18nT("static.j6hscu"),
      icon: "pi pi-info-circle",
      defaultFocus: "accept",
      accept: () => {
        setSelectedData(data);
        handleRestore(data);
      },
      reject: () => {},
      footer: (options) => (
        <div className="flex gap-3 justify-end">
          <Button
            label={i18nT("static.r5wqai")}
            icon="pi pi-times"
            onClick={options.reject}
            className="p-button-text"
          />
          <Button
            label={i18nT("static.1dudzcg")}
            icon="pi pi-check"
            onClick={options.accept}
            className="p-button-success"
          />
        </div>
      ),
    });
  };

  const onClickPurge = (data: EmployeeIncomeComponent) => {
    requestActionConfirmation({
      message: i18nT("static.1umz31y"),
      header: i18nT("static.14tdkvz"),
      icon: "pi pi-info-circle",
      defaultFocus: "accept",
      accept: () => {
        handlePurge(data);
      },
      reject: () => {},
      footer: (options) => (
        <div className="flex gap-3 justify-end">
          <Button
            label={i18nT("static.r5wqai")}
            icon="pi pi-times"
            onClick={options.reject}
            className="p-button-text"
          />
          <Button
            label={i18nT("static.1dudzcg")}
            icon="pi pi-check"
            onClick={options.accept}
            className="p-button-danger"
          />
        </div>
      ),
    });
  };

  const onChangeIncomeComponent = (id: number) => {
    const incomeComponent = incomeComponentData?.find(
      (ic: IncomeComponent) => ic.id === id,
    );
    if (incomeComponent) {
      setSelectedIncomeComponent(incomeComponent);
    }
  };

  const calculationMethodCode =
    selectedIncomeComponent?.calculation_method_code?.toUpperCase() ?? "";
  const isFixedAmount =
    calculationMethodCode === "FIXED_AMOUNT" ||
    calculationMethodCode === "FIXED";
  const isPercentage = calculationMethodCode === "PERCENTAGE";
  const isWorkingPeriod = calculationMethodCode === "WORKING_PERIOD";

  const incomeComponentReferenceOptionTemplate = (option: IncomeComponent) => (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <span className="truncate text-sm text-slate-800">{option.name}</span>
      <Tag
        value={
          option.assignment_mode === "SYSTEM"
            ? i18nT("static.13qbhrw")
            : i18nT("static.1fak8xt")
        }
        severity={option.assignment_mode === "SYSTEM" ? "info" : "secondary"}
      />
    </div>
  );

  const componentCalculationBody = (row: EmployeeIncomeComponent) => {
    const master = incomeComponentData?.find(
      (component) => component.id === row.income_component_master_id,
    );
    const methodCode = master?.calculation_method_code?.toUpperCase();
    const methodName =
      master?.calculation_method_name ??
      master?.calculation_display ??
      methodCode;

    if (methodCode === "WORKING_PERIOD") {
      return (
        <div className="flex min-w-[15rem] flex-col gap-1">
          <Tag value={methodName ?? i18nT("static.13jiiyh")} severity="info" />
          <span className="text-xs text-slate-500">
            {i18nT("static.b8aegk")}{" "}
          </span>
        </div>
      );
    }

    if (methodCode === "PERCENTAGE") {
      const reference = row.based_on_component_id
        ? incomeComponentData?.find(
            (component) => component.id === row.based_on_component_id,
          )
        : null;
      const referenceLabel = reference
        ? `${reference.name}${reference.code ? ` (${reference.code})` : ""}`
        : "Basic Salary (default)";

      return (
        <div className="flex min-w-[15rem] flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Tag value={methodName ?? i18nT("static.wa149h")} severity="info" />
            <span className="font-semibold text-slate-800">
              {formatPayrollPercentage(row.percentage)}
            </span>
          </div>
          <span className="text-xs text-slate-500">
            {i18nT("static.65yyxy")}{" "}
            <span className="font-medium text-slate-700">{referenceLabel}</span>
          </span>
        </div>
      );
    }

    if (methodCode === "FIXED_AMOUNT" || methodCode === "FIXED") {
      return (
        <div className="flex min-w-[12rem] flex-col gap-1">
          <Tag
            value={methodName ?? i18nT("static.7lgj73")}
            severity="success"
          />
          <span className="font-semibold text-slate-800">
            {formatPayrollCurrency(Number(row.amount ?? 0))}
          </span>
        </div>
      );
    }

    return (
      <div className="flex min-w-[12rem] flex-col gap-1">
        <span className="font-medium text-slate-800">
          {methodName ?? i18nT("static.4tqh3i")}
        </span>
        <span className="text-xs text-slate-500">
          {i18nT("static.1igt8mo")}{" "}
          {formatPayrollCurrency(Number(row.amount ?? 0))}
        </span>
      </div>
    );
  };

  const frequencyBody = (row: EmployeeIncomeComponent) => {
    if (!row.frequency) {
      return <span className="text-slate-500">{i18nT("static.1ntesau")}</span>;
    }

    const frequency = frequencyData?.find((item) => item.id === row.frequency);
    if (!frequency) {
      return <span className="text-slate-500">{i18nT("static.1enplif")}</span>;
    }

    return (
      <div className="flex min-w-[9rem] flex-col">
        <span className="font-medium text-slate-800">{frequency.name}</span>
        <span className="text-xs text-slate-500">
          {frequency.code} {i18nT("static.1pteltd")} {frequency.days_in_period}{" "}
          {i18nT("static.kjdug7")}{" "}
        </span>
      </div>
    );
  };

  const periodBody = (row: EmployeeIncomeComponent) => (
    <div className="flex min-w-[12rem] flex-col">
      <span className="text-sm text-slate-800">
        {formatPayrollDate(row.start_date)}
      </span>
      <span className="text-xs text-slate-500">
        {i18nT("static.rg2a5r")} {formatPayrollDate(row.end_date)}
      </span>
    </div>
  );

  return (
    <>
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-5">
          <EmployeeDetailTableHeader
            title={i18nT("static.14pnb2x")}
            description={i18nT("static.1wmt3v6")}
            showDeleted={
              archivedAccess.canShowDeleted
                ? {
                    checked: isShowDeletedDataChecked,
                    onChange: onIngredientsChange,
                    label: i18nT("static.1beum2j"),
                  }
                : undefined
            }
            search={{
              value: globalFilterValue,
              onChange: onGlobalFilterChange,
              placeholder: i18nT("static.1ftg9vz"),
            }}
            actions={
              <>
                <Button
                  type="button"
                  label={i18nT("static.28r6qc")}
                  icon="pi pi-refresh"
                  severity="secondary"
                  outlined
                  size="small"
                  loading={isValidating}
                  disabled={isValidating}
                  className="w-full sm:w-auto"
                  onClick={() =>
                    void mutate(
                      `/api/employees/${id}/income-component?show_all=${archivedAccess.canShowDeleted && isShowDeletedDataChecked}`,
                    )
                  }
                />
                {canCreate && (
                  <Button
                    type="button"
                    label={i18nT("static.x2sal3")}
                    icon="pi pi-plus"
                    size="small"
                    className="w-full sm:w-auto"
                    onClick={onClickNew}
                  />
                )}
              </>
            }
          />

          <DataTable
            value={EmployeeIncomeComponentData ?? []}
            tableStyle={{ minWidth: "78rem" }}
            stripedRows
            rowHover
            paginator
            scrollable
            responsiveLayout="scroll"
            removableSort
            size="small"
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            dataKey="id"
            globalFilterFields={["income_component_name", "notes"]}
            emptyMessage={i18nT("static.xtmeag")}
            filters={filters}
            currentPageReportTemplate={i18nT("static.1kqh8lr")}
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            loading={isLoading}
          >
            <Column
              header="#"
              headerStyle={{ width: "3rem" }}
              body={(data, options) => options.rowIndex + 1}
            />
            <Column
              field="income_component_name"
              header={i18nT("static.bvqo3k")}
              sortable
              style={{ minWidth: "16rem" }}
              body={(row: EmployeeIncomeComponent) => {
                const master = incomeComponentData?.find(
                  (component) =>
                    component.id === row.income_component_master_id,
                );
                return (
                  <div className="flex min-w-[14rem] flex-col">
                    <span className="font-medium text-slate-800">
                      {row.income_component_name ?? i18nT("static.4tqh3i")}
                    </span>
                    <span className="text-xs text-slate-500">
                      {master?.code ?? ""}
                    </span>
                  </div>
                );
              }}
            />
            <Column
              header={i18nT("static.1gig16e")}
              body={componentCalculationBody}
              style={{ minWidth: "17rem" }}
            />
            <Column
              header={i18nT("static.1rexqhx")}
              style={{ minWidth: "13rem" }}
              body={(row: EmployeeIncomeComponent) => {
                if (!row.is_fixed_allowance) {
                  return (
                    <Tag value={i18nT("static.ye709x")} severity="secondary" />
                  );
                }
                const programs = [
                  row.include_in_bpjs_health ? "Health" : null,
                  row.include_in_bpjs_employment ? "Employment" : null,
                ].filter(Boolean);
                return (
                  <Tag
                    value={
                      programs.length
                        ? programs.join(" + ")
                        : i18nT("static.tio6hj")
                    }
                    severity={programs.length ? "success" : "secondary"}
                  />
                );
              }}
            />
            <Column
              header={i18nT("static.1bwcvhr")}
              body={periodBody}
              style={{ minWidth: "14rem" }}
            />
            <Column
              field="frequency"
              header={i18nT("static.1m95xl7")}
              sortable
              body={frequencyBody}
              style={{ minWidth: "11rem" }}
            />
            <Column
              field="notes"
              header={i18nT("static.4f76ga")}
              style={{ minWidth: "14rem" }}
              body={(row: EmployeeIncomeComponent) => (
                <span
                  className="block max-w-[14rem] truncate text-slate-600"
                  title={row.notes ?? ""}
                >
                  {row.notes || "-"}
                </span>
              )}
            />
            <Column
              field="is_active"
              header={i18nT("static.3pd73")}
              sortable
              body={activeColumnBody}
              style={{ minWidth: "9rem" }}
            />
            <Column
              headerClassName="bg-white"
              bodyClassName="bg-white"
              header={i18nT("static.2wk0tb")}
              body={(rowData) => actionColumnBody(rowData)}
              frozen
              alignFrozen="right"
              headerStyle={{
                width: "11rem",
                minWidth: "11rem",
                textAlign: "right",
              }}
              bodyStyle={{ width: "11rem", minWidth: "11rem" }}
            />
          </DataTable>
        </div>
      </Card>

      <Dialog
        header={popupHeaderTitle}
        visible={visible}
        style={{ width: "95vw", maxWidth: "46rem" }}
        breakpoints={{ "640px": "95vw" }}
        modal
        draggable={false}
        resizable={false}
        closeOnEscape={!isSubmitting}
        closable={!isSubmitting}
        onHide={closeForm}
        footer={footerContent}
        onShow={() => {
          setTimeout(() => setFocus("income_component_master_id"), 0);
        }}
      >
        <form
          id="employee-income-component-form"
          onSubmit={handleSubmit((data) => onSubmit(data))}
          className="grid grid-cols-1 gap-5 pt-2 sm:grid-cols-2"
        >
          <div className="flex flex-col gap-2 sm:col-span-2">
            <label
              htmlFor="employee_id"
              className="text-sm font-medium text-slate-700"
            >
              {i18nT("static.1fak8xt")}{" "}
            </label>
            <Controller
              name="employee_id"
              control={control}
              rules={{ required: i18nT("static.2s9hk0") }}
              render={({ field, fieldState }) => (
                <>
                  <Dropdown
                    id="employee_id"
                    appendTo={() => document.body}
                    value={field.value}
                    options={employeeActive}
                    loading={employeeIsLoading}
                    disabled={employeeIsLoading || !!employeeError}
                    onChange={(e) => field.onChange(e.value)}
                    optionLabel="full_name"
                    optionValue="id"
                    placeholder={
                      employeeIsLoading
                        ? i18nT("static.151p210")
                        : i18nT("static.atd8u4")
                    }
                    className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                  />
                  {fieldState.error && (
                    <small className="p-error">
                      {fieldState.error.message}
                    </small>
                  )}
                  {employeeError && (
                    <small className="p-error">{i18nT("static.r7jgxj")} </small>
                  )}
                </>
              )}
            />
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <label
              htmlFor="income_component_master_id"
              className="text-sm font-medium text-slate-700"
            >
              {i18nT("static.14pnb2x")}{" "}
              <span className="ml-1 text-red-500">*</span>
            </label>
            <Controller
              name="income_component_master_id"
              control={control}
              rules={{ required: i18nT("static.r200e0") }}
              render={({ field, fieldState }) => (
                <>
                  <Dropdown
                    id="income_component_master_id"
                    appendTo={() => document.body}
                    value={field.value}
                    options={employeeIncomeComponentActive}
                    loading={incomeComponentIsLoading}
                    disabled={
                      incomeComponentIsLoading || !!incomeComponentError
                    }
                    onChange={(e) => {
                      field.onChange(e.value);
                      onChangeIncomeComponent(e.value);
                    }}
                    optionLabel="name"
                    optionValue="id"
                    placeholder={
                      incomeComponentIsLoading
                        ? i18nT("static.vznp1o")
                        : i18nT("static.lg7l5k")
                    }
                    className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                  />
                  {fieldState.error && (
                    <small className="p-error">
                      {fieldState.error.message}
                    </small>
                  )}
                  {incomeComponentError && (
                    <small className="p-error font-bold">
                      {i18nT("static.10jyp93")}{" "}
                    </small>
                  )}
                </>
              )}
            />
          </div>

          {isFixedAmount && (
            <>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="amount"
                  className="text-sm font-medium text-slate-700"
                >
                  {i18nT("static.a2ky21")}
                  <span className="ml-1 text-red-500">*</span>
                </label>
                <Controller
                  name="amount"
                  control={control}
                  defaultValue={0}
                  rules={{ required: i18nT("static.1lf34iw") }}
                  render={({ field, fieldState }) => (
                    <>
                      <InputNumber
                        id="amount"
                        placeholder={i18nT("static.119fv83")}
                        inputRef={field.ref}
                        mode="currency"
                        currency="IDR"
                        locale="id-ID"
                        min={0}
                        onValueChange={(e) => {
                          field.onChange(e.value);
                        }}
                        value={Number(field.value ? field.value : 0)}
                        className={
                          fieldState.invalid ? "w-full p-invalid" : "w-full"
                        }
                      />
                      {fieldState.error && (
                        <small className="font-bold p-error">
                          {" "}
                          {fieldState.error.message}{" "}
                        </small>
                      )}
                    </>
                  )}
                />
              </div>
            </>
          )}

          <div className="flex flex-col gap-2">
            <label
              htmlFor="frequency"
              className="text-sm font-medium text-slate-700"
            >
              {i18nT("static.1m95xl7")}
              <span className="ml-1 text-red-500">*</span>
            </label>
            <Controller
              name="frequency"
              control={control}
              rules={{ required: i18nT("static.hva68e") }}
              render={({ field, fieldState }) => (
                <>
                  <Dropdown
                    id="frequency"
                    appendTo={() => document.body}
                    value={field.value}
                    options={activeFrequency}
                    loading={isLoadingFrequency}
                    disabled={
                      isWorkingPeriod || isLoadingFrequency || !!errorFrequency
                    }
                    onChange={(e) => field.onChange(e.value)}
                    optionLabel="name"
                    optionValue="id"
                    placeholder={
                      isLoadingFrequency
                        ? i18nT("static.ah3k8b")
                        : i18nT("static.veufz8")
                    }
                    className={
                      fieldState.invalid ? "p-invalid w-full" : "w-full"
                    }
                  />
                  {isWorkingPeriod && (
                    <small className="text-slate-500">
                      {i18nT("static.1l84av2")}{" "}
                    </small>
                  )}
                  {fieldState.error && (
                    <small className="p-error">
                      {fieldState.error.message}
                    </small>
                  )}
                  {errorFrequency && (
                    <small className="p-error font-bold">
                      {i18nT("static.mqysi6")}{" "}
                    </small>
                  )}
                </>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:col-span-2 sm:grid-cols-2">
            <div className="flex flex-col">
              <label
                htmlFor="start_date"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                {i18nT("static.7bl5hd")}
                <span className="ml-1 text-red-500">*</span>
              </label>
              <Controller
                name="start_date"
                control={control}
                rules={{ required: i18nT("static.1lf34iw") }}
                render={({ field, fieldState }) => (
                  <>
                    <Calendar
                      dateFormat="dd MM yy"
                      showIcon
                      appendTo={() => document.body}
                      {...field}
                      id="start_date"
                      value={field.value ? dayjs(field.value).toDate() : null}
                      onChange={(e) => field.onChange(e.value)}
                      hourFormat="24"
                      className={
                        fieldState.invalid ? "w-full p-invalid" : "w-full"
                      }
                    />
                    {fieldState.error && (
                      <small className="font-bold p-error">
                        {" "}
                        {fieldState.error.message}{" "}
                      </small>
                    )}
                  </>
                )}
              />
            </div>

            <div className="flex flex-col">
              <label
                htmlFor="end_date"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                {i18nT("static.1j4m31m")}{" "}
              </label>
              <Controller
                name="end_date"
                control={control}
                render={({ field, fieldState }) => (
                  <>
                    <Calendar
                      dateFormat="dd MM yy"
                      showIcon
                      appendTo={() => document.body}
                      {...field}
                      id="end_date"
                      value={field.value ? dayjs(field.value).toDate() : null}
                      onChange={(e) => field.onChange(e.value)}
                      hourFormat="24"
                      className={
                        fieldState.invalid ? "w-full p-invalid" : "w-full"
                      }
                    />
                    {fieldState.error && (
                      <small className="font-bold p-error">
                        {" "}
                        {fieldState.error.message}{" "}
                      </small>
                    )}
                  </>
                )}
              />
            </div>
          </div>

          {isPercentage && (
            <>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="based_on_component_id"
                  className="text-sm font-medium text-slate-700"
                >
                  {i18nT("static.xgw1bf")}{" "}
                </label>
                <Controller
                  name="based_on_component_id"
                  control={control}
                  render={({ field, fieldState }) => (
                    <>
                      <Dropdown
                        id="based_on_component_id"
                        appendTo={() => document.body}
                        value={field.value}
                        options={incomeComponentReferenceOptions}
                        loading={incomeComponentIsLoading}
                        disabled={
                          incomeComponentIsLoading || !!incomeComponentError
                        }
                        onChange={(e) => field.onChange(e.value)}
                        optionLabel="name"
                        optionValue="id"
                        itemTemplate={incomeComponentReferenceOptionTemplate}
                        filter
                        showClear
                        placeholder={
                          incomeComponentIsLoading
                            ? i18nT("static.vznp1o")
                            : i18nT("static.lg7l5k")
                        }
                        className={
                          fieldState.invalid ? "p-invalid w-full" : "w-full"
                        }
                      />
                      {fieldState.error && (
                        <small className="font-bold">
                          {fieldState.error.message}
                        </small>
                      )}
                      {incomeComponentError && (
                        <small className="p-error font-bold">
                          {i18nT("static.10jyp93")}{" "}
                        </small>
                      )}
                    </>
                  )}
                />
              </div>
            </>
          )}

          {isPercentage && (
            <>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="percentage"
                  className="text-sm font-medium text-slate-700"
                >
                  {i18nT("static.wa149h")}
                  <span className="ml-1 text-red-500">*</span>
                </label>
                <Controller
                  name="percentage"
                  control={control}
                  defaultValue={0}
                  rules={{ required: i18nT("static.1lf34iw") }}
                  render={({ field, fieldState }) => (
                    <>
                      <InputNumber
                        id="percentage"
                        placeholder={i18nT("static.1eyj90v")}
                        inputRef={field.ref}
                        suffix="%"
                        min={0}
                        max={100}
                        onValueChange={(e) => field.onChange(e.value)}
                        value={Number(field.value ?? 0)}
                        className={
                          fieldState.invalid ? "w-full p-invalid" : "w-full"
                        }
                      />
                      {fieldState.error && (
                        <small className="font-bold p-error">
                          {fieldState.error.message}
                        </small>
                      )}
                    </>
                  )}
                />
              </div>
            </>
          )}

          <div className="flex flex-col gap-2 sm:col-span-2">
            <label
              htmlFor="notes"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              {i18nT("static.4f76ga")}{" "}
            </label>
            <Controller
              name="notes"
              control={control}
              render={({ field, fieldState }) => (
                <>
                  <InputTextarea
                    id="notes"
                    placeholder={i18nT("static.wu0ooo")}
                    {...field}
                    value={field.value ?? ""}
                    rows={3}
                    autoResize
                    className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                  />
                  {fieldState.error && (
                    <small className="font-bold p-error">
                      {" "}
                      {fieldState.error.message}{" "}
                    </small>
                  )}
                </>
              )}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
            <Controller
              name="is_active"
              control={control}
              defaultValue={true}
              render={({ field }) => (
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <label
                      htmlFor="is_active"
                      className="cursor-pointer text-sm font-medium text-slate-700"
                    >
                      {i18nT("static.1uu2ztk")}{" "}
                    </label>
                    <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                      {i18nT("static.148ezbn")}{" "}
                    </p>
                  </div>
                  <InputSwitch
                    id="is_active"
                    checked={Boolean(field.value)}
                    onChange={(e) => field.onChange(e.value)}
                  />
                </div>
              )}
            />
          </div>
        </form>
      </Dialog>
    </>
  );
};

export default EmployeePayrollEmployeeIncomeComponentTableData;
