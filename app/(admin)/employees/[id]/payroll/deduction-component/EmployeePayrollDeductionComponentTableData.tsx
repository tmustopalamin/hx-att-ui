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
import { useMemo, useState, type ReactNode } from "react";
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
import { EmployeeDeductionComponent } from "@/app/types/employee-deduction-component";
import { useParams } from "next/navigation";
import dayjs from "dayjs";
import {
  createEmployeeDeductionComponent,
  updateEmployeeDeductionComponent,
  deleteEmployeeDeductionComponent,
  purgeEmployeeDeductionComponent,
  restoreEmployeeDeductionComponent,
} from "@/app/services/employee-deduction-component-service";
import { InputSwitch } from "primereact/inputswitch";
import { Tag } from "primereact/tag";
import { Frequency } from "@/app/types/frequency";
import { DeductionComponent } from "@/app/types/deduction-component";
import { useDirtyFormGuard } from "@/app/_components/useDirtyFormGuard";
import EmployeeDetailTableHeader from "@/app/(admin)/employees/[id]/_components/EmployeeDetailTableHeader";
import {
  formatPayrollCurrency,
  formatPayrollDate,
} from "@/app/(admin)/employees/[id]/payroll/_components/payroll-display-formatters";

const EmployeePayrollDeductionComponentTableData = () => {
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
    useState<EmployeeDeductionComponent | null>(null);
  const [selectedDeductionComponent, setSelectedDeductionComponent] =
    useState<DeductionComponent | null>(null);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState({
    global: { value: "", matchMode: FilterMatchMode.CONTAINS },
  });
  const [isAddNew, setIsAddNew] = useState(false);
  const [visible, setVisible] = useState(false);
  const {
    control,
    handleSubmit,
    setFocus,
    formState: { isDirty, isSubmitting },
    reset,
    clearErrors,
  } = useForm<EmployeeDeductionComponent>();
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
    setSelectedData(null);
    setSelectedDeductionComponent(null);
    setIsAddNew(true);
    setVisible(true);
    reset({
      id: 0,
      employee_id: Number(id),
      deduction_component_master_id: 0,
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
        form="employee-deduction-component-form"
        label={isAddNew ? i18nT("static.1q8ufrl") : i18nT("static.6gmm1l")}
        icon="pi pi-check"
        loading={isSubmitting}
        disabled={isSubmitting}
        className="w-full sm:w-auto"
      />
    </div>
  );

  const {
    data: EmployeeDeductionComponentData,
    error,
    isLoading,
    isValidating,
  } = useSWR<EmployeeDeductionComponent[]>(
    `/api/employees/${id}/deduction-component?show_all=${
      archivedAccess.canShowDeleted && isShowDeletedDataChecked
    }`,
    fetcher,
  );
  const { data: employeeData, isLoading: employeeIsLoading } =
    useSWR<EmployeePersonalData>(`/api/employees/${id}/personal-data`, fetcher);
  const {
    data: employeeDeductionComponentData,
    error: employeeDeductionComponentError,
    isLoading: employeeDeductionComponentIsLoading,
  } = useSWR<DeductionComponent[]>(`/api/deduction-component`, fetcher);
  const {
    data: frequencyData,
    error: frequencyError,
    isLoading: frequencyLoading,
  } = useSWR<Frequency[]>(`/api/frequency`, fetcher);
  const employeeFullName = useMemo(() => {
    if (!employeeData) return "";
    return [
      employeeData.first_name,
      employeeData.middle_name,
      employeeData.last_name,
    ]
      .filter(Boolean)
      .join(" ");
  }, [employeeData]);
  const employeeDeductionComponentActive = useMemo(
    () =>
      employeeDeductionComponentData?.filter(
        (a) =>
          (a.is_active ||
            a.id === selectedData?.deduction_component_master_id) &&
          a.assignment_mode === "EMPLOYEE",
      ) ?? [],
    [
      employeeDeductionComponentData,
      selectedData?.deduction_component_master_id,
    ],
  );
  const activeFrequency = frequencyData?.filter(
    (frequency) => frequency.is_active,
  );

  if (isLoading) return <LoadingDataTable />;
  if (error) {
    return (
      <ErrorNotConnectedToApi
        mutateKey={`/api/employees/${id}/deduction-component?show_all=${archivedAccess.canShowDeleted && isShowDeletedDataChecked}`}
      />
    );
  }

  const onIngredientsChange = () => {
    setIsShowDeletedDataChecked(!isShowDeletedDataChecked);
  };

  const handleSubmitNew = async (data: EmployeeDeductionComponent) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await createEmployeeDeductionComponent({
          ...data,
          employee_id: Number(id),
        });
      setVisible(false);
      reset();
      await mutate(
        `/api/employees/${id}/deduction-component?show_all=${archivedAccess.canShowDeleted && isShowDeletedDataChecked}`,
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

  const handleUpdate = async (data: EmployeeDeductionComponent) => {
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
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await updateEmployeeDeductionComponent(
          selectedData.id,
          selectedData.row_version,
          data,
        );

      setVisible(false);
      await mutate(
        `/api/employees/${id}/deduction-component?show_all=${archivedAccess.canShowDeleted && isShowDeletedDataChecked}`,
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

  const handleDelete = async (data: EmployeeDeductionComponent) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await deleteEmployeeDeductionComponent(data.id, data);
      setVisible(false);
      reset();
      await mutate(
        `/api/employees/${id}/deduction-component?show_all=${archivedAccess.canShowDeleted && isShowDeletedDataChecked}`,
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

  const handlePurge = async (data: EmployeeDeductionComponent) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await purgeEmployeeDeductionComponent(data.id, data);
      setVisible(false);
      reset();
      await mutate(
        `/api/employees/${id}/deduction-component?show_all=${archivedAccess.canShowDeleted && isShowDeletedDataChecked}`,
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

  const handleRestore = async (data: EmployeeDeductionComponent) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await restoreEmployeeDeductionComponent(data.id, data);
      setVisible(false);
      reset();
      await mutate(
        `/api/employees/${id}/deduction-component?show_all=${archivedAccess.canShowDeleted && isShowDeletedDataChecked}`,
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

  const onSubmit = async (data: EmployeeDeductionComponent) => {
    if (isAddNew) {
      await handleSubmitNew(data);
      return;
    }

    if (selectedData) {
      await handleUpdate(data);
    }
  };

  const onChangeDeductionComponent = (componentId: number) => {
    const found = employeeDeductionComponentData?.find(
      (c) => c.id === componentId,
    );
    setSelectedDeductionComponent(found ?? null);
  };

  const onClickUpdate = (data: EmployeeDeductionComponent) => {
    setVisible(true);
    setIsAddNew(false);

    const updatedData = {
      ...data,
      start_date: data.start_date ? dayjs(data.start_date).toDate() : null,
      end_date: data.end_date ? dayjs(data.end_date).toDate() : null,
    };

    reset(updatedData);
    setSelectedData(updatedData);
    setSelectedDeductionComponent(
      employeeDeductionComponentData?.find(
        (c) => c.id === data.deduction_component_master_id,
      ) ?? null,
    );
  };

  const activeColumnBody = (rowData: EmployeeDeductionComponent) => {
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

  const actionColumnBody = (rowData: EmployeeDeductionComponent) => {
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
              aria-label={i18nT("static.15v8hdz")}
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
              aria-label={i18nT("static.yur91")}
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
              aria-label={i18nT("static.1rdhys6")}
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
              aria-label={i18nT("static.8rzjp")}
              onClick={() => {
                onClickUpdate(rowData);
              }}
            />
          )}
        </div>
      </>
    );
  };

  const onClickDelete = (data: EmployeeDeductionComponent) => {
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

  const onClickRestore = (data: EmployeeDeductionComponent) => {
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

  const onClickPurge = (data: EmployeeDeductionComponent) => {
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

  const componentCalculationBody = (row: EmployeeDeductionComponent) => {
    const master = employeeDeductionComponentData?.find(
      (component) => component.id === row.deduction_component_master_id,
    );
    const methodName =
      master?.calculation_method_name ??
      master?.calculation_display ??
      "Not configured";

    return (
      <div className="flex min-w-[15rem] flex-col gap-1">
        <Tag value={methodName} severity="warning" />
        <span className="font-semibold text-slate-800">
          {i18nT("static.x64815")}{" "}
          {formatPayrollCurrency(Number(row.amount ?? 0))}
        </span>
      </div>
    );
  };

  const frequencyBody = (row: EmployeeDeductionComponent) => {
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

  const periodBody = (row: EmployeeDeductionComponent) => (
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
            title={i18nT("static.wfytj7")}
            description={i18nT("static.1bt6l0u")}
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
              placeholder: i18nT("static.r1kuvh"),
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
                      `/api/employees/${id}/deduction-component?show_all=${archivedAccess.canShowDeleted && isShowDeletedDataChecked}`,
                    )
                  }
                />
                {canCreate && (
                  <Button
                    type="button"
                    label={i18nT("static.14tpx85")}
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
            value={EmployeeDeductionComponentData ?? []}
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
            globalFilterFields={["deduction_component_name", "notes"]}
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
              field="deduction_component_name"
              header={i18nT("static.bvqo3k")}
              sortable
              style={{ minWidth: "16rem" }}
              body={(row: EmployeeDeductionComponent) => {
                const master = employeeDeductionComponentData?.find(
                  (component) =>
                    component.id === row.deduction_component_master_id,
                );
                return (
                  <div className="flex min-w-[14rem] flex-col">
                    <span className="font-medium text-slate-800">
                      {row.deduction_component_name ?? i18nT("static.4tqh3i")}
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
              body={(row: EmployeeDeductionComponent) => (
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
        header={
          <div className="flex items-center gap-2">
            <i
              className={`pi ${
                isAddNew
                  ? "pi-plus-circle text-blue-600"
                  : "pi-pencil text-amber-600"
              } text-lg`}
            />
            <span className="text-base font-semibold text-slate-800">
              {isAddNew ? i18nT("static.14tpx85") : i18nT("static.8rzjp")}
            </span>
          </div>
        }
        visible={visible}
        style={{ width: "95vw", maxWidth: "44rem" }}
        breakpoints={{ "640px": "95vw" }}
        modal
        draggable={false}
        resizable={false}
        closeOnEscape={!isSubmitting}
        closable={!isSubmitting}
        onHide={closeForm}
        footer={footerContent}
        onShow={() => {
          setTimeout(() => setFocus("deduction_component_master_id"), 0);
        }}
      >
        <form
          id="employee-deduction-component-form"
          onSubmit={handleSubmit((data) => onSubmit(data))}
          className="grid grid-cols-1 gap-5 pt-2 sm:grid-cols-2"
        >
          {/* Employee Context Summary Card */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 sm:col-span-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <i className="pi pi-user text-base" />
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {i18nT("static.1fak8xt")}
                </span>
                <span className="truncate text-sm font-semibold text-slate-800">
                  {employeeFullName ||
                    (employeeIsLoading
                      ? i18nT("static.151p210")
                      : `Employee #${id}`)}
                </span>
              </div>
            </div>
            <Tag
              severity="info"
              value={`ID: ${id}`}
              rounded
              className="font-mono text-xs"
            />
          </div>

          {/* Hidden Employee ID field to preserve form state */}
          <Controller
            name="employee_id"
            control={control}
            defaultValue={Number(id)}
            render={({ field }) => (
              <input type="hidden" name={field.name} value={field.value} />
            )}
          />

          {/* Component Selection */}
          <div className="sm:col-span-2">
            <Controller
              name="deduction_component_master_id"
              control={control}
              rules={{
                required: i18nT("static.1lbe6bq"),
                validate: (val) =>
                  (val && Number(val) > 0) || i18nT("static.1lbe6bq"),
              }}
              render={({ field, fieldState }) => (
                <Field
                  id="deduction_component_master_id"
                  label={i18nT("static.wfytj7")}
                  required
                  error={fieldState.error?.message}
                  hint={
                    employeeDeductionComponentError
                      ? i18nT("static.1n8ef6d")
                      : undefined
                  }
                >
                  <Dropdown
                    id="deduction_component_master_id"
                    appendTo={() => document.body}
                    value={field.value || null}
                    options={employeeDeductionComponentActive}
                    loading={employeeDeductionComponentIsLoading}
                    disabled={
                      employeeDeductionComponentIsLoading ||
                      !!employeeDeductionComponentError
                    }
                    filter
                    showClear={false}
                    onChange={(e) => {
                      field.onChange(e.value);
                      onChangeDeductionComponent(e.value);
                    }}
                    optionLabel="name"
                    optionValue="id"
                    placeholder={
                      employeeDeductionComponentIsLoading
                        ? i18nT("static.1f9g9mu")
                        : i18nT("static.j2clvy")
                    }
                    className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                  />
                </Field>
              )}
            />
          </div>

          {/* Selected Component Information Banner */}
          {selectedDeductionComponent && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 text-xs text-slate-600 sm:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">
                    {selectedDeductionComponent.code}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-600">
                    Metode:{" "}
                    <strong className="text-slate-800">
                      {selectedDeductionComponent.calculation_method_name ||
                        selectedDeductionComponent.calculation_display ||
                        "Standard"}
                    </strong>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Tag
                    value={
                      selectedDeductionComponent.is_taxable
                        ? "Mengurangi Pajak"
                        : "Tidak Mengurangi Pajak"
                    }
                    severity={
                      selectedDeductionComponent.is_taxable
                        ? "info"
                        : "secondary"
                    }
                    className="text-[11px]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Amount */}
          <Controller
            name="amount"
            control={control}
            defaultValue={0}
            rules={{
              required: i18nT("static.1lf34iw"),
              min: { value: 0, message: "Nominal tidak boleh negatif" },
            }}
            render={({ field, fieldState }) => (
              <Field
                id="amount"
                label={i18nT("static.a2ky21")}
                required
                error={fieldState.error?.message}
              >
                <InputNumber
                  id="amount"
                  placeholder={i18nT("static.119fv83")}
                  inputRef={field.ref}
                  mode="currency"
                  currency="IDR"
                  locale="id-ID"
                  min={0}
                  onValueChange={(e) => field.onChange(e.value)}
                  value={Number(field.value ? field.value : 0)}
                  className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                />
              </Field>
            )}
          />

          {/* Frequency */}
          <Controller
            name="frequency"
            control={control}
            rules={{ required: i18nT("static.hva68e") }}
            render={({ field, fieldState }) => (
              <Field
                id="frequency"
                label={i18nT("static.1m95xl7")}
                required
                error={fieldState.error?.message}
                hint={frequencyError ? i18nT("static.mqysi6") : undefined}
              >
                <Dropdown
                  id="frequency"
                  appendTo={() => document.body}
                  value={field.value}
                  options={activeFrequency}
                  loading={frequencyLoading}
                  disabled={frequencyLoading || !!frequencyError}
                  onChange={(event) => field.onChange(event.value)}
                  optionLabel="name"
                  optionValue="id"
                  placeholder={i18nT("static.veufz8")}
                  className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                />
              </Field>
            )}
          />

          {/* Start Date & End Date */}
          <div className="grid grid-cols-1 gap-5 sm:col-span-2 sm:grid-cols-2">
            <Controller
              name="start_date"
              control={control}
              rules={{ required: i18nT("static.1lf34iw") }}
              render={({ field, fieldState }) => (
                <Field
                  id="start_date"
                  label={i18nT("static.7bl5hd")}
                  required
                  error={fieldState.error?.message}
                >
                  <Calendar
                    dateFormat="dd MM yy"
                    showIcon
                    appendTo={() => document.body}
                    {...field}
                    id="start_date"
                    value={field.value ? dayjs(field.value).toDate() : null}
                    onChange={(e) => field.onChange(e.value)}
                    hourFormat="24"
                    className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                  />
                </Field>
              )}
            />

            <Controller
              name="end_date"
              control={control}
              render={({ field, fieldState }) => (
                <Field
                  id="end_date"
                  label={i18nT("static.1j4m31m")}
                  hint="Kosongkan jika berlaku tanpa batas waktu"
                  error={fieldState.error?.message}
                >
                  <Calendar
                    dateFormat="dd MM yy"
                    showIcon
                    appendTo={() => document.body}
                    {...field}
                    id="end_date"
                    value={field.value ? dayjs(field.value).toDate() : null}
                    onChange={(e) => field.onChange(e.value)}
                    hourFormat="24"
                    className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                  />
                </Field>
              )}
            />
          </div>

          {/* Notes */}
          <div className="sm:col-span-2">
            <Controller
              name="notes"
              control={control}
              render={({ field, fieldState }) => (
                <Field
                  id="notes"
                  label={i18nT("static.4f76ga")}
                  error={fieldState.error?.message}
                >
                  <InputTextarea
                    id="notes"
                    placeholder={i18nT("static.wu0ooo")}
                    {...field}
                    value={field.value ?? ""}
                    rows={3}
                    autoResize
                    className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                  />
                </Field>
              )}
            />
          </div>

          {/* Status Switch */}
          <div className="sm:col-span-2">
            <Controller
              name="is_active"
              control={control}
              defaultValue={true}
              render={({ field }) => (
                <StatusOption
                  inputId="is_active"
                  label={i18nT("static.1uu2ztk")}
                  description={i18nT("static.148ezbn")}
                  checked={Boolean(field.value)}
                  onChange={(checked) => field.onChange(checked)}
                />
              )}
            />
          </div>
        </form>
      </Dialog>
    </>
  );
};

function Field({
  id,
  label,
  required = false,
  hint,
  error,
  children,
  className = "",
}: {
  id?: string;
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label
        htmlFor={id}
        className="flex items-center gap-1 text-sm font-medium text-slate-700"
      >
        <span>{label}</span>
        {required && <span className="font-bold text-red-500">*</span>}
      </label>
      {children}
      {error ? (
        <small className="text-xs p-error">{error}</small>
      ) : (
        hint && <small className="text-xs text-slate-500">{hint}</small>
      )}
    </div>
  );
}

function StatusOption({
  inputId,
  label,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  inputId: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <InputSwitch
        inputId={inputId}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(Boolean(event.value))}
      />
      <div className="min-w-0">
        <label
          htmlFor={inputId}
          className="cursor-pointer text-sm font-semibold text-slate-700"
        >
          {label}
        </label>
        <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

export default EmployeePayrollDeductionComponentTableData;
