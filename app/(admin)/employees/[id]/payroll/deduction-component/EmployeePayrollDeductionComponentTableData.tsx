"use client";

import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Controller, useForm } from "react-hook-form";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import { useState } from "react";
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
import { Checkbox } from "primereact/checkbox";
import { RootState } from "@/store/store";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { InputNumber } from "primereact/inputnumber";
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

const EmployeePayrollDeductionComponentTableData = () => {
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
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState({
    global: { value: "", matchMode: FilterMatchMode.CONTAINS },
  });
  const [isAddNew, setIsAddNew] = useState(false);
  const [visible, setVisible] = useState(false);
  const [popupHeaderTitle, setPopupHeaderTitle] = useState("");
  const {
    control,
    handleSubmit,
    setFocus,
    formState: { isValid },
    reset,
    clearErrors,
  } = useForm<EmployeeDeductionComponent>();
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
    setIsAddNew(true);
    setVisible(true);
    setPopupHeaderTitle("New Deduction Component");
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

  const footerContent = (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
      <Button
        type="button"
        label="Cancel"
        icon="pi pi-times"
        text
        severity="secondary"
        className="w-full sm:w-auto"
        onClick={() => {
          setVisible(false);
        }}
      />
      <Button
        type="submit"
        form="employee-deduction-component-form"
        label={isAddNew ? "Submit" : "Save"}
        icon="pi pi-check"
        className="w-full sm:w-auto"
      />
    </div>
  );

  const {
    data: EmployeeDeductionComponentData,
    error,
    isLoading,
  } = useSWR<EmployeeDeductionComponent[]>(
    `/api/employees/${id}/deduction-component?show_all=${
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
    data: employeeDeductionComponentData,
    error: employeeDeductionComponentError,
    isLoading: employeeDeductionComponentIsLoading,
  } = useSWR<DeductionComponent[]>(`/api/deduction-component`, fetcher);
  const {
    data: frequencyData,
    error: frequencyError,
    isLoading: frequencyLoading,
  } = useSWR<Frequency[]>(`/api/frequency`, fetcher);
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
  const employeeDeductionComponentActive =
    employeeDeductionComponentData?.filter(
      (a) => a.is_active && a.assignment_mode === "EMPLOYEE",
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
          summary: "success",
          detail: res.message,
        }),
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "error",
            detail: getErrorMessage(err, "message"),
          }),
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "error",
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
          summary: "error",
          detail: "please select data",
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
          summary: "success",
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
            summary: "error",
            detail: getErrorMessage(err, "message"),
          }),
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "error",
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
          summary: "success",
          detail: res.message,
        }),
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "error",
            detail: getErrorMessage(err, "message"),
          }),
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "error",
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
          summary: "success",
          detail: res.message,
        }),
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "error",
            detail: getErrorMessage(err, "message"),
          }),
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "error",
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
          summary: "success",
          detail: res.message,
        }),
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "error",
            detail: getErrorMessage(err, "message"),
          }),
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "error",
            detail: err.message,
          }),
        );
      }
    }
  };

  const onSubmit = (data: EmployeeDeductionComponent) => {
    if (!isValid) return;

    if (isAddNew) {
      handleSubmitNew(data);
      return;
    }

    if (selectedData) {
      handleUpdate(data);
    }
  };

  const onClickUpdate = (data: EmployeeDeductionComponent) => {
    setVisible(true);
    setIsAddNew(false);
    setPopupHeaderTitle("Update Deduction Component");

    const updatedData = {
      ...data,
      start_date: dayjs(data.start_date).toDate(),
      end_date: dayjs(data.end_date).toDate(),
    };

    reset(updatedData);
    setSelectedData(updatedData);
  };

  const activeColumnBody = (rowData: EmployeeDeductionComponent) => {
    return rowData.is_active ? (
      <Tag value="Active" severity="success" />
    ) : (
      <Tag value="Inactive" severity="danger" />
    );
  };

  const actionColumnBody = (rowData: EmployeeDeductionComponent) => {
    return (
      <>
        <div className="flex gap-2">
          {canPurge && rowData.deleted_at && (
            <Button
              tooltipOptions={{
                appendTo: () => document.body,
                position: "top",
              }}
              tooltip="delete forever"
              rounded
              severity="secondary"
              label=""
              icon="pi pi-times"
              size="small"
              onClick={() => {
                onClickPurge(rowData);
              }}
            />
          )}

          {canRestore && rowData.deleted_at && (
            <Button
              tooltipOptions={{
                appendTo: () => document.body,
                position: "top",
              }}
              tooltip="restore"
              rounded
              severity="success"
              label=""
              icon="pi pi-refresh"
              size="small"
              onClick={() => {
                onClickRestore(rowData);
              }}
            />
          )}

          {canDelete && !rowData.deleted_at && (
            <Button
              tooltipOptions={{
                appendTo: () => document.body,
                position: "top",
              }}
              tooltip="delete"
              rounded
              severity="danger"
              label=""
              icon="pi pi-trash"
              size="small"
              onClick={() => {
                onClickDelete(rowData);
              }}
            />
          )}

          {canUpdate && !rowData.deleted_at && (
            <Button
              tooltipOptions={{
                appendTo: () => document.body,
                position: "top",
              }}
              tooltip="update"
              rounded
              severity="help"
              label=""
              icon="pi pi-pencil"
              size="small"
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
      message: "Do you want to delete this record?",
      header: "Delete Confirmation",
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
            label="No"
            icon="pi pi-times"
            onClick={options.reject}
            className="p-button-text"
          />
          <Button
            label="Yes"
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
      message: "Do you want to restore this record?",
      header: "Restore Confirmation",
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
            label="No"
            icon="pi pi-times"
            onClick={options.reject}
            className="p-button-text"
          />
          <Button
            label="Yes"
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
      message: "Do you want to delete this record forever?",
      header: "Delete Confirmation",
      icon: "pi pi-info-circle",
      defaultFocus: "accept",
      accept: () => {
        handlePurge(data);
      },
      reject: () => {},
      footer: (options) => (
        <div className="flex gap-3 justify-end">
          <Button
            label="No"
            icon="pi pi-times"
            onClick={options.reject}
            className="p-button-text"
          />
          <Button
            label="Yes"
            icon="pi pi-check"
            onClick={options.accept}
            className="p-button-danger"
          />
        </div>
      ),
    });
  };

  return (
    <>
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Deduction Component
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Manage recurring and one-time deduction components for this
                employee.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:justify-end">
              {canCreate && (
                <Button
                  label="New Deduction Component"
                  icon="pi pi-plus"
                  size="small"
                  className="w-full sm:w-auto"
                  onClick={() => onClickNew()}
                />
              )}

              {archivedAccess.canShowDeleted && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    inputId="showDeletedData"
                    name="showDeletedData"
                    value="yes"
                    onChange={onIngredientsChange}
                    checked={isShowDeletedDataChecked}
                  />
                  <label
                    htmlFor="showDeletedData"
                    className="cursor-pointer select-none text-sm text-slate-600"
                  >
                    Show deleted records
                  </label>
                </div>
              )}

              <IconField iconPosition="left" className="w-full sm:w-72">
                <InputIcon className="pi pi-search" />
                <InputText
                  className="w-full"
                  value={globalFilterValue}
                  onChange={onGlobalFilterChange}
                  placeholder="Search deduction component"
                />
              </IconField>
            </div>
          </div>

          <DataTable
            value={EmployeeDeductionComponentData}
            tableStyle={{ minWidth: "50rem" }}
            stripedRows
            paginator
            scrollable
            scrollHeight="500px"
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            dataKey="id"
            globalFilterFields={["name"]}
            emptyMessage="No data found."
            filters={filters}
            currentPageReportTemplate="{first} to {last} of {totalRecords}"
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            loading={isLoading}
          >
            <Column
              header="#"
              headerStyle={{ width: "3rem" }}
              body={(data, options) => options.rowIndex + 1}
            />
            <Column field="deduction_component_name" header="Component" />
            <Column field="start_date" header="Start Date" />
            <Column field="end_date" header="End Date" />
            <Column field="amount" header="Amount" />
            <Column field="frequency" header="Frequency" />
            <Column field="notes" header="Notes" />
            <Column field="is_active" header="Active" body={activeColumnBody} />
            <Column
              headerClassName="bg-white"
              className="bg-white"
              header="Action"
              body={(rowData) => actionColumnBody(rowData)}
              frozen={true}
              alignFrozen="right"
            />
          </DataTable>
        </div>
      </Card>

      <Dialog
        header={popupHeaderTitle}
        visible={visible}
        style={{ width: "95vw", maxWidth: "42rem" }}
        breakpoints={{ "640px": "95vw" }}
        modal
        draggable={false}
        resizable={false}
        closeOnEscape
        closable
        onHide={() => {
          if (!visible) return;
          setVisible(false);
          reset();
        }}
        footer={footerContent}
        onShow={() => {
          setTimeout(() => setFocus("deduction_component_master_id"), 0);
        }}
      >
        <form
          id="employee-deduction-component-form"
          onSubmit={handleSubmit((data) => onSubmit(data))}
          className="flex flex-col gap-4 pt-1"
        >
          <div className="flex flex-col gap-2">
            <label
              htmlFor="employee_id"
              className="text-sm font-medium text-slate-700"
            >
              Employee
            </label>
            <Controller
              name="employee_id"
              control={control}
              rules={{ required: "Employee is required" }}
              render={({ field, fieldState }) => (
                <>
                  <Dropdown
                    id="employee_id"
                    appendTo={() => document.body}
                    value={field.value}
                    options={employeeActive}
                    loading={isLoading}
                    disabled={employeeIsLoading || !!employeeError}
                    onChange={(e) => field.onChange(e.value)}
                    optionLabel="full_name"
                    optionValue="id"
                    placeholder={
                      isLoading ? "Loading employees..." : "Select an employee"
                    }
                    className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                  />
                  {fieldState.error && (
                    <small className="p-error">
                      {fieldState.error.message}
                    </small>
                  )}
                  {employeeError && (
                    <small className="p-error">
                      We couldn’t load the list of employees. Please try again
                    </small>
                  )}
                </>
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="deduction_component_master_id"
              className="text-sm font-medium text-slate-700"
            >
              Deduction Component
              <span className="ml-1 text-red-500">*</span>
            </label>
            <Controller
              name="deduction_component_master_id"
              control={control}
              rules={{ required: "Deduction Component is required" }}
              render={({ field, fieldState }) => (
                <>
                  <Dropdown
                    id="deduction_component_master_id"
                    appendTo={() => document.body}
                    value={field.value}
                    options={employeeDeductionComponentActive}
                    loading={isLoading}
                    disabled={
                      employeeDeductionComponentIsLoading ||
                      !!employeeDeductionComponentError
                    }
                    onChange={(e) => field.onChange(e.value)}
                    optionLabel="name"
                    optionValue="id"
                    placeholder={
                      isLoading
                        ? "Loading Deduction components..."
                        : "Select a Deduction component"
                    }
                    className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                  />
                  {fieldState.error && (
                    <small className="p-error">
                      {fieldState.error.message}
                    </small>
                  )}
                  {employeeDeductionComponentError && (
                    <small className="p-error font-bold">
                      We couldn’t load the list of Deduction components. Please
                      try again
                    </small>
                  )}
                </>
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="amount"
              className="text-sm font-medium text-slate-700"
            >
              Amount<span className="ml-1 text-red-500">*</span>
            </label>
            <Controller
              name="amount"
              control={control}
              defaultValue={0}
              rules={{ required: "*required" }}
              render={({ field, fieldState }) => (
                <>
                  <InputNumber
                    id="amount"
                    placeholder="input amount of balance"
                    inputRef={field.ref}
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

          <div className="m-0 flex flex-col gap-2">
            <label
              htmlFor="frequency"
              className="text-sm font-medium text-slate-700"
            >
              Frequency<span className="ml-1 text-red-500">*</span>
            </label>
            <Controller
              name="frequency"
              control={control}
              rules={{ required: "Frequency is required" }}
              render={({ field, fieldState }) => (
                <>
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
                    placeholder="Select a frequency"
                    className={
                      fieldState.invalid ? "p-invalid w-full" : "w-full"
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

          <div className="flex w-full gap-5">
            <div className="flex w-full flex-col gap-2 sm:w-1/2">
              <label
                htmlFor="start_date"
                className="text-sm font-medium text-slate-700"
              >
                Start Date<span className="ml-1 text-red-500">*</span>
              </label>
              <Controller
                name="start_date"
                control={control}
                rules={{ required: "*required" }}
                render={({ field, fieldState }) => (
                  <>
                    <Calendar
                      dateFormat="dd-mm-yy"
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

            <div className="flex w-full flex-col gap-2 sm:w-1/2">
              <label
                htmlFor="end_date"
                className="text-sm font-medium text-slate-700"
              >
                End Date
              </label>
              <Controller
                name="end_date"
                control={control}
                render={({ field, fieldState }) => (
                  <>
                    <Calendar
                      dateFormat="dd-mm-yy"
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

          <div className="m-0 flex flex-col gap-2">
            <label
              htmlFor="notes"
              className="text-sm font-medium text-slate-700"
            >
              Notes
            </label>
            <Controller
              name="notes"
              control={control}
              render={({ field, fieldState }) => (
                <>
                  <InputText
                    id="notes"
                    placeholder=""
                    {...field}
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

          <div className="m-0 flex flex-col gap-2">
            <label
              htmlFor="is_active"
              className="text-sm font-medium text-slate-700"
            >
              Active
            </label>
            <Controller
              name="is_active"
              control={control}
              defaultValue={true}
              render={({ field }) => (
                <InputSwitch
                  id="is_active"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.value)}
                />
              )}
            />
          </div>
        </form>
      </Dialog>
    </>
  );
};

export default EmployeePayrollDeductionComponentTableData;
