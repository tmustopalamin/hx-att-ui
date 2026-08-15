"use client";

import { useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import { Controller, useForm } from "react-hook-form";
import { useParams } from "next/navigation";
import { useDispatch } from "react-redux";
import dayjs from "dayjs";

import { fetcher } from "@/app/utils/fetcher";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { showToast } from "@/store/ToastSlice";
import { useArchivedDataAccess } from "@/app/utils/archived-data-access";
import EmployeeDetailTableHeader from "@/app/(admin)/employees/[id]/_components/EmployeeDetailTableHeader";

import {
  createEmployeeLeaveBalance,
  deleteEmployeeLeaveBalance,
  purgeEmployeeLeaveBalance,
  restoreEmployeeLeaveBalance,
  updateEmployeeLeaveBalance,
} from "@/app/services/employee-leave-balance-service";

import {
  EmployeeLeaveBalance,
  EmployeeLeaveBalanceForm,
} from "@/app/types/employee-leave-balance";

import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { Tag } from "primereact/tag";

type LeaveTypeOption = {
  id: number;
  code?: string | null;
  name: string;
  is_active?: boolean;
  deleted_at?: string | null;
};

const getBody = () => document.body;

const emptyForm: EmployeeLeaveBalanceForm = {
  id: 0,
  employee_id: 0,
  leave_type_id: 0,
  period_start: null,
  period_end: null,
  opening_balance: 0,
  entitlement: 0,
  taken: 0,
  adjustment: 0,
  closing_balance: 0,
  expired_balance: 0,
  deleted_at: null,
  row_version: 0,
};

const LeaveTableData = () => {
  const params = useParams();
  const employeeId = Number(params.id);
  const dispatch = useDispatch();
  const archivedAccess = useArchivedDataAccess("employee-leave-balance");

  const [selectedData, setSelectedData] = useState<EmployeeLeaveBalance | null>(
    null,
  );
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState({
    global: { value: "", matchMode: FilterMatchMode.CONTAINS },
  });
  const [isAddNew, setIsAddNew] = useState(false);
  const [visible, setVisible] = useState(false);
  const [popupHeaderTitle, setPopupHeaderTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] =
    useState(false);

  const {
    control,
    handleSubmit,
    setFocus,
    formState: { isValid },
    reset,
    clearErrors,
  } = useForm<EmployeeLeaveBalanceForm>({
    defaultValues: emptyForm,
    mode: "onChange",
  });

  const leaveBalanceKey = `/api/employees/${employeeId}/leave-balance?show_all=${
    archivedAccess.canShowDeleted && isShowDeletedDataChecked
  }`;

  const {
    data: leaveBalanceData,
    error,
    isLoading,
  } = useSWR<EmployeeLeaveBalance[]>(leaveBalanceKey, fetcher);

  const {
    data: leaveTypeData,
    error: leaveTypeError,
    isLoading: leaveTypeIsLoading,
  } = useSWR<LeaveTypeOption[]>("/api/leave-type?show_all=false", fetcher);

  const leaveTypeActive = useMemo(
    () =>
      (leaveTypeData ?? []).filter(
        (item) => item.is_active !== false && !item.deleted_at,
      ),
    [leaveTypeData],
  );

  const refreshList = async () => {
    await mutate(leaveBalanceKey);
  };

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters({
      global: { value, matchMode: FilterMatchMode.CONTAINS },
    });
    setGlobalFilterValue(value);
  };

  const openNew = () => {
    clearErrors();
    setSelectedData(null);
    setIsAddNew(true);
    setVisible(true);
    setPopupHeaderTitle("New Leave Balance");
    reset({
      ...emptyForm,
      employee_id: employeeId,
    });

    setTimeout(() => {
      setFocus("leave_type_id");
    }, 0);
  };

  const openEdit = (data: EmployeeLeaveBalance) => {
    setSelectedData(data);
    setIsAddNew(false);
    setVisible(true);
    setPopupHeaderTitle("Edit Leave Balance");

    reset({
      id: data.id,
      employee_id: data.employee_id,
      leave_type_id: data.leave_type_id,
      period_start: data.period_start
        ? dayjs(data.period_start).toDate()
        : null,
      period_end: data.period_end ? dayjs(data.period_end).toDate() : null,
      opening_balance: Number(data.opening_balance ?? 0),
      entitlement: Number(data.entitlement ?? 0),
      taken: Number(data.taken ?? 0),
      adjustment: Number(data.adjustment ?? 0),
      closing_balance: Number(data.closing_balance ?? 0),
      expired_balance: Number(data.expired_balance ?? 0),
      deleted_at: data.deleted_at,
      row_version: data.row_version,
    });
  };

  const closeDialog = () => {
    setVisible(false);
    setSelectedData(null);
    reset(emptyForm);
  };

  const handleSubmitNew = async (data: EmployeeLeaveBalanceForm) => {
    try {
      const payload: EmployeeLeaveBalanceForm = {
        ...data,
        employee_id: employeeId,
      };

      const res = await createEmployeeLeaveBalance(payload);

      closeDialog();
      await refreshList();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res.message ?? "Leave balance created successfully",
        }),
      );
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

  const handleUpdate = async (data: EmployeeLeaveBalanceForm) => {
    if (!selectedData) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Error",
          detail: "Please select data",
        }),
      );
      return;
    }

    try {
      const payload: EmployeeLeaveBalanceForm = {
        ...data,
        employee_id: employeeId,
      };

      const res = await updateEmployeeLeaveBalance(
        selectedData.id,
        selectedData.row_version,
        payload,
      );

      closeDialog();
      await refreshList();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res.message ?? "Leave balance updated successfully",
        }),
      );
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

  const handleDelete = async (data: EmployeeLeaveBalance) => {
    try {
      const res = await deleteEmployeeLeaveBalance(data.id, data);
      await refreshList();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res.message ?? "Leave balance deleted successfully",
        }),
      );
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

  const handleRestore = async (data: EmployeeLeaveBalance) => {
    try {
      const res = await restoreEmployeeLeaveBalance(data.id, data);
      await refreshList();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res.message ?? "Leave balance restored successfully",
        }),
      );
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

  const handlePurge = async (data: EmployeeLeaveBalance) => {
    try {
      const res = await purgeEmployeeLeaveBalance(data.id, data);
      await refreshList();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res.message ?? "Leave balance permanently deleted",
        }),
      );
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

  const onSubmit = async (data: EmployeeLeaveBalanceForm) => {
    if (!isValid || isSaving) return;

    setIsSaving(true);
    try {
      if (isAddNew) {
        await handleSubmitNew(data);
        return;
      }

      if (selectedData) {
        await handleUpdate(data);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const onClickDelete = (data: EmployeeLeaveBalance) => {
    requestActionConfirmation({
      message: "Do you want to delete this leave balance?",
      header: "Delete Confirmation",
      icon: "pi pi-info-circle",
      acceptClassName: "p-button-danger",
      accept: () => {
        void handleDelete(data);
      },
    });
  };

  const onClickRestore = (data: EmployeeLeaveBalance) => {
    requestActionConfirmation({
      message: "Do you want to restore this leave balance?",
      header: "Restore Confirmation",
      icon: "pi pi-info-circle",
      acceptClassName: "p-button-success",
      accept: () => {
        void handleRestore(data);
      },
    });
  };

  const onClickPurge = (data: EmployeeLeaveBalance) => {
    requestActionConfirmation({
      message: "Do you want to permanently delete this leave balance?",
      header: "Permanent Delete Confirmation",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: () => {
        void handlePurge(data);
      },
    });
  };

  const periodBodyTemplate = (rowData: EmployeeLeaveBalance) => {
    const start = rowData.period_start
      ? dayjs(rowData.period_start).format("DD MMM YYYY")
      : "-";
    const end = rowData.period_end
      ? dayjs(rowData.period_end).format("DD MMM YYYY")
      : "-";

    return `${start} - ${end}`;
  };

  const closingBalanceBodyTemplate = (rowData: EmployeeLeaveBalance) => {
    const value = Number(rowData.closing_balance ?? 0);

    if (value > 0) {
      return <Tag value={String(value)} severity="success" />;
    }

    if (value < 0) {
      return <Tag value={String(value)} severity="danger" />;
    }

    return <Tag value="0" severity="secondary" />;
  };

  const statusBodyTemplate = (rowData: EmployeeLeaveBalance) => {
    return rowData.deleted_at ? (
      <Tag value="Deleted" severity="danger" />
    ) : (
      <Tag value="Active" severity="success" />
    );
  };

  const actionColumnBody = (rowData: EmployeeLeaveBalance) => {
    if (rowData.deleted_at) {
      return (
        <div className="flex flex-nowrap items-center justify-end gap-2">
          {archivedAccess.canRestore && (
            <Button
              rounded
              outlined
              severity="success"
              icon="pi pi-refresh"
              size="small"
              tooltip="Restore"
              tooltipOptions={{
                appendTo: () => document.body,
                position: "top",
              }}
              onClick={() => onClickRestore(rowData)}
            />
          )}
          {archivedAccess.canPurge && (
            <Button
              rounded
              outlined
              severity="danger"
              icon="pi pi-trash"
              size="small"
              tooltip="Delete Forever"
              tooltipOptions={{
                appendTo: () => document.body,
                position: "top",
              }}
              onClick={() => onClickPurge(rowData)}
            />
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-nowrap items-center justify-end gap-2">
        <Button
          rounded
          outlined
          severity="secondary"
          icon="pi pi-pencil"
          size="small"
          tooltip="Edit"
          tooltipOptions={{ appendTo: () => document.body, position: "top" }}
          onClick={() => openEdit(rowData)}
        />
        <Button
          rounded
          outlined
          severity="danger"
          icon="pi pi-trash"
          size="small"
          tooltip="Delete"
          tooltipOptions={{ appendTo: () => document.body, position: "top" }}
          onClick={() => onClickDelete(rowData)}
        />
      </div>
    );
  };

  if (isLoading) return <LoadingDataTable />;

  if (error) {
    return <ErrorNotConnectedToApi mutateKey={leaveBalanceKey} />;
  }

  return (
    <>
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-5">
          <EmployeeDetailTableHeader
            title="Leave Balance"
            description="Manage employee leave balance period, entitlement, usage, and remaining balance."
            showDeleted={
              archivedAccess.canShowDeleted
                ? {
                    checked: isShowDeletedDataChecked,
                    onChange: setIsShowDeletedDataChecked,
                  }
                : undefined
            }
            search={{
              value: globalFilterValue,
              onChange: onGlobalFilterChange,
              placeholder: "Search leave balance",
            }}
            actions={
              <Button
                type="button"
                label="New Leave Balance"
                icon="pi pi-plus"
                size="small"
                className="w-full sm:w-auto"
                onClick={openNew}
              />
            }
          />

          <DataTable
            value={leaveBalanceData ?? []}
            stripedRows
            rowHover
            removableSort
            responsiveLayout="scroll"
            size="small"
            paginator
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            dataKey="id"
            filters={filters}
            globalFilterFields={[
              "leave_type_name",
              "period_start",
              "period_end",
            ]}
            emptyMessage="No leave balance found."
            currentPageReportTemplate="{first} to {last} of {totalRecords}"
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            loading={isLoading}
            scrollable
            tableStyle={{ minWidth: "90rem" }}
          >
            <Column
              header="#"
              headerStyle={{ width: "3rem" }}
              body={(_, options) => options.rowIndex + 1}
            />
            <Column
              field="leave_type_name"
              header="Leave Type"
              sortable
              style={{ minWidth: "14rem" }}
            />
            <Column
              header="Period"
              body={periodBodyTemplate}
              style={{ minWidth: "16rem" }}
            />
            <Column
              field="opening_balance"
              header="Opening"
              sortable
              style={{ minWidth: "8rem" }}
            />
            <Column
              field="entitlement"
              header="Entitlement"
              sortable
              style={{ minWidth: "8rem" }}
            />
            <Column
              field="taken"
              header="Taken"
              sortable
              style={{ minWidth: "8rem" }}
            />
            <Column
              field="adjustment"
              header="Adjustment"
              sortable
              style={{ minWidth: "8rem" }}
            />
            <Column
              header="Closing"
              body={closingBalanceBodyTemplate}
              style={{ minWidth: "8rem" }}
            />
            <Column
              field="expired_balance"
              header="Expired"
              style={{ minWidth: "8rem" }}
            />
            <Column
              header="Status"
              body={statusBodyTemplate}
              style={{ minWidth: "8rem" }}
            />
            <Column
              header="Action"
              body={actionColumnBody}
              frozen
              alignFrozen="right"
              headerClassName="bg-white"
              className="bg-white"
              headerStyle={{
                width: "10rem",
                minWidth: "10rem",
                textAlign: "right",
              }}
              bodyStyle={{ width: "10rem", minWidth: "10rem" }}
            />
          </DataTable>
        </div>
      </Card>

      <Dialog
        header={popupHeaderTitle}
        visible={visible}
        style={{ width: "95vw", maxWidth: "52rem" }}
        breakpoints={{ "640px": "95vw" }}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              type="button"
              label="Cancel"
              icon="pi pi-times"
              text
              severity="secondary"
              disabled={isSaving}
              className="w-full sm:w-auto"
              onClick={closeDialog}
            />
            <Button
              type="submit"
              form="leave-balance-form"
              label={isAddNew ? "Create Leave Balance" : "Save Changes"}
              icon="pi pi-check"
              loading={isSaving}
              disabled={!isValid || isSaving}
              className="w-full sm:w-auto"
            />
          </div>
        }
        modal
        draggable={false}
        resizable={false}
        closeOnEscape={!isSaving}
        closable={!isSaving}
        onHide={closeDialog}
        onShow={() => setTimeout(() => setFocus("leave_type_id"), 0)}
      >
        <form
          id="leave-balance-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5 pt-2"
        >
          <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3">
            <p className="m-0 text-sm leading-6 text-slate-600">
              Define the leave period and balance allocation for this employee.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 pt-2 md:grid-cols-2">
            <Controller
              name="leave_type_id"
              control={control}
              rules={{
                required: "Leave type is required",
                validate: (value) =>
                  Number(value) > 0 || "Leave type is required",
              }}
              render={({ field, fieldState }) => (
                <div className="md:col-span-2">
                  <label
                    htmlFor="leave_type_id"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Leave Type
                    <span className="ml-1 text-red-500">*</span>
                  </label>
                  <Dropdown
                    id="leave_type_id"
                    appendTo={getBody}
                    value={field.value}
                    options={leaveTypeActive}
                    onChange={(e) => field.onChange(e.value)}
                    optionLabel="name"
                    optionValue="id"
                    placeholder="Select leave type"
                    loading={leaveTypeIsLoading}
                    disabled={leaveTypeIsLoading || !!leaveTypeError}
                    className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                  />
                  {fieldState.error && (
                    <small className="p-error">
                      {fieldState.error.message}
                    </small>
                  )}
                </div>
              )}
            />

            <Controller
              name="period_start"
              control={control}
              rules={{ required: "Period start is required" }}
              render={({ field, fieldState }) => (
                <div>
                  <label
                    htmlFor="period_start"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Period Start
                    <span className="ml-1 text-red-500">*</span>
                  </label>
                  <Calendar
                    id="period_start"
                    appendTo={getBody}
                    dateFormat="dd-mm-yy"
                    showIcon
                    value={field.value}
                    onChange={(e) => field.onChange(e.value)}
                    className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                  />
                  {fieldState.error && (
                    <small className="p-error">
                      {fieldState.error.message}
                    </small>
                  )}
                </div>
              )}
            />

            <Controller
              name="period_end"
              control={control}
              rules={{ required: "Period end is required" }}
              render={({ field, fieldState }) => (
                <div>
                  <label
                    htmlFor="period_end"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Period End
                    <span className="ml-1 text-red-500">*</span>
                  </label>
                  <Calendar
                    id="period_end"
                    appendTo={getBody}
                    dateFormat="dd-mm-yy"
                    showIcon
                    value={field.value}
                    onChange={(e) => field.onChange(e.value)}
                    className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                  />
                  {fieldState.error && (
                    <small className="p-error">
                      {fieldState.error.message}
                    </small>
                  )}
                </div>
              )}
            />

            <Controller
              name="opening_balance"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Opening Balance
                  </label>
                  <InputNumber
                    value={field.value}
                    onValueChange={(e) => field.onChange(e.value ?? 0)}
                    className="w-full"
                    min={0}
                    useGrouping={false}
                  />
                </div>
              )}
            />

            <Controller
              name="entitlement"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Entitlement
                  </label>
                  <InputNumber
                    value={field.value}
                    onValueChange={(e) => field.onChange(e.value ?? 0)}
                    className="w-full"
                    min={0}
                    useGrouping={false}
                  />
                </div>
              )}
            />

            <Controller
              name="taken"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Taken (system)
                  </label>
                  <InputNumber
                    value={field.value}
                    onValueChange={() => undefined}
                    className="w-full"
                    min={0}
                    useGrouping={false}
                    disabled
                  />
                </div>
              )}
            />

            <Controller
              name="adjustment"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Adjustment
                  </label>
                  <InputNumber
                    value={field.value}
                    onValueChange={(e) => field.onChange(e.value ?? 0)}
                    className="w-full"
                    useGrouping={false}
                  />
                </div>
              )}
            />

            <Controller
              name="closing_balance"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Closing Balance (calculated)
                  </label>
                  <InputNumber
                    value={field.value}
                    onValueChange={() => undefined}
                    className="w-full"
                    useGrouping={false}
                    disabled
                  />
                </div>
              )}
            />

            <Controller
              name="expired_balance"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Expired Balance
                  </label>
                  <InputNumber
                    value={field.value}
                    onValueChange={(e) => field.onChange(e.value ?? 0)}
                    className="w-full"
                    min={0}
                    useGrouping={false}
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

export default LeaveTableData;
