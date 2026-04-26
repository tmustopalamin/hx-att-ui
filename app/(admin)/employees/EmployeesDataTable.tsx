"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import useSWR, { mutate } from "swr";
import { useDispatch } from "react-redux";
import { Controller, useForm } from "react-hook-form";

import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";
import { confirmDialog, ConfirmDialog } from "primereact/confirmdialog";
import { Dialog } from "primereact/dialog";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { Checkbox } from "primereact/checkbox";
import { Tag } from "primereact/tag";

import { fetcher } from "@/app/utils/fetcher";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";

import { Employee } from "@/app/types/employee";
import { ReligionType } from "@/app/types/religion-type";
import { Gender } from "@/app/types/gender";
import { MaritalStatus } from "@/app/types/marital-status";
import { getErrorMessage, isResponseTypeError } from "@/app/utils/error-messages";
import { showToast } from "@/store/ToastSlice";
import {
  createEmployee,
  deleteEmployee,
  purgeEmployee,
  restoreEmployee,
} from "@/app/services/employee-service";

type EmployeeForm = {
  first_name: string;
  last_name: string;
  birth_place: string;
  dob: Date | null;
  gender_id: number | null;
  religion_id: number | null;
  marital_status_id: string;
};

const EMPLOYEE_LIST_KEY = (showAll: boolean) =>
  `/api/employees/list?show_all=${showAll}`;

const getBody = () => document.body;

const emptyForm: EmployeeForm = {
  first_name: "",
  last_name: "",
  birth_place: "",
  dob: null,
  gender_id: null,
  religion_id: null,
  marital_status_id: "",
};

const EmployeesDataTable = () => {
  const dispatch = useDispatch();

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState({
    global: { value: "", matchMode: FilterMatchMode.CONTAINS },
  });
  const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    clearErrors,
    setFocus,
    formState: { errors, isValid },
  } = useForm<EmployeeForm>({
    defaultValues: emptyForm,
    mode: "onChange",
  });

  const {
    data: employeesData,
    error,
    isLoading,
  } = useSWR<Employee[]>(EMPLOYEE_LIST_KEY(isShowDeletedDataChecked), fetcher);

  const {
    data: genderData,
    error: genderError,
    isLoading: genderIsLoading,
  } = useSWR<Gender[]>("/api/gender", fetcher);

  const {
    data: religionData,
    error: religionError,
    isLoading: religionIsLoading,
  } = useSWR<ReligionType[]>("/api/religion", fetcher);

  const {
    data: maritalStatusData,
    error: maritalStatusError,
    isLoading: maritalStatusIsLoading,
  } = useSWR<MaritalStatus[]>("/api/marital", fetcher);

  const genderActive = useMemo(
    () => genderData?.filter((item) => item.is_active) ?? [],
    [genderData]
  );

  const religionActive = useMemo(
    () => religionData?.filter((item) => item.is_active) ?? [],
    [religionData]
  );

  const maritalStatusActive = useMemo(
    () => maritalStatusData?.filter((item) => item.is_active) ?? [],
    [maritalStatusData]
  );

  const refreshList = async () => {
    await mutate(EMPLOYEE_LIST_KEY(isShowDeletedDataChecked));
  };

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setGlobalFilterValue(value);
    setFilters({
      global: { value, matchMode: FilterMatchMode.CONTAINS },
    });
  };

  const openNew = () => {
    clearErrors();
    reset(emptyForm);
    setVisible(true);

    setTimeout(() => {
      setFocus("first_name");
    }, 0);
  };

  const hideDialog = () => {
    setVisible(false);
    reset(emptyForm);
  };

  const buildEmployeePayload = (form: EmployeeForm): Employee => {
    const firstName = form.first_name.trim();
    const lastName = form.last_name.trim();
    const fullName = [firstName, lastName].filter(Boolean).join(" ");

    return {
      id: 0,
      first_name: firstName,
      middle_name: null,
      last_name: lastName,
      preferred_name: null,
      full_name: fullName,
      dob: form.dob ? dayjs(form.dob).format("YYYY-MM-DD") : "",
      gender_id: Number(form.gender_id),
      religion_id: Number(form.religion_id),
      birth_place: form.birth_place.trim(),
      marital_status_id: form.marital_status_id,
      photo_url: null,
      phone_number: null,
      personal_email: null,
      work_email: null,
      nationality_country_id: null,
      deleted_at: null,
      row_version: 0,
      agency_name: null,
      branch_name: null,
      department_name: null,
      position_name: null,
      code: null,
    };
  };

  const handleSubmitNew = async (form: EmployeeForm) => {
    if (!isValid) return;

    try {
      setIsSubmitting(true);

      const payload = buildEmployeePayload(form);
      const res = await createEmployee(payload);

      hideDialog();
      await refreshList();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res?.message ?? "Employee created successfully",
        })
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: getErrorMessage(err, "message"),
          })
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: err.message,
          })
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (data: Employee) => {
    try {
      const res = await deleteEmployee(data.id, data.row_version);
      await refreshList();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res?.message ?? "Employee deleted successfully",
        })
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: getErrorMessage(err, "message"),
          })
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: err.message,
          })
        );
      }
    }
  };

  const handleRestore = async (data: Employee) => {
    try {
      const res = await restoreEmployee(data.id, data.row_version);
      await refreshList();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res?.message ?? "Employee restored successfully",
        })
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: getErrorMessage(err, "message"),
          })
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: err.message,
          })
        );
      }
    }
  };

  const handlePurge = async (data: Employee) => {
    try {
      const res = await purgeEmployee(data.id);
      await refreshList();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res?.message ?? "Employee permanently deleted",
        })
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: getErrorMessage(err, "message"),
          })
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: err.message,
          })
        );
      }
    }
  };

  const onClickDelete = (data: Employee) => {
    confirmDialog({
      message: "Do you want to delete this employee?",
      header: "Delete Confirmation",
      icon: "pi pi-info-circle",
      acceptClassName: "p-button-danger",
      accept: () => {
        void handleDelete(data);
      },
      footer: (options) => (
        <div className="flex justify-end gap-3">
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

  const onClickRestore = (data: Employee) => {
    confirmDialog({
      message: "Do you want to restore this employee?",
      header: "Restore Confirmation",
      icon: "pi pi-info-circle",
      acceptClassName: "p-button-success",
      accept: () => {
        void handleRestore(data);
      },
      footer: (options) => (
        <div className="flex justify-end gap-3">
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

  const onClickPurge = (data: Employee) => {
    confirmDialog({
      message: "Do you want to permanently delete this employee?",
      header: "Permanent Delete Confirmation",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: () => {
        void handlePurge(data);
      },
      footer: (options) => (
        <div className="flex justify-end gap-3">
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

  const fullNameBody = (rowData: Employee) => {
    if (rowData.full_name?.trim()) return rowData.full_name;

    return [
      rowData.first_name,
      rowData.middle_name,
      rowData.last_name,
    ]
      .filter(Boolean)
      .join(" ");
  };

  const statusBody = (rowData: Employee) => {
    return rowData.deleted_at ? (
      <Tag value="Deleted" severity="danger" />
    ) : (
      <Tag value="Active" severity="success" />
    );
  };

  const deletedAtBody = (rowData: Employee) => {
    if (!rowData.deleted_at) return "-";
    return dayjs(rowData.deleted_at).format("DD MMM YYYY HH:mm");
  };

  const actionColumnBody = (rowData: Employee) => {
    const isDeleted = !!rowData.deleted_at;

    return (
      <div className="flex gap-2">
        {!isDeleted && (
          <>
            <Button
              tooltipOptions={{ appendTo: () => document.body, position: "top" }}
              tooltip="Delete"
              rounded
              severity="danger"
              icon="pi pi-trash"
              size="small"
              onClick={() => onClickDelete(rowData)}
            />
            <Link href={`/employees/${rowData.id}/general/personal`}>
              <Button
                tooltipOptions={{ appendTo: () => document.body, position: "top" }}
                tooltip="Detail"
                rounded
                severity="help"
                icon="pi pi-pencil"
                size="small"
              />
            </Link>
          </>
        )}

        {isDeleted && (
          <>
            <Button
              tooltipOptions={{ appendTo: () => document.body, position: "top" }}
              tooltip="Restore"
              rounded
              severity="success"
              icon="pi pi-refresh"
              size="small"
              onClick={() => onClickRestore(rowData)}
            />
            <Button
              tooltipOptions={{ appendTo: () => document.body, position: "top" }}
              tooltip="Delete Forever"
              rounded
              severity="secondary"
              icon="pi pi-times"
              size="small"
              onClick={() => onClickPurge(rowData)}
            />
          </>
        )}
      </div>
    );
  };

  if (isLoading) return <LoadingDataTable />;

  if (error) {
    return <ErrorNotConnectedToApi mutateKey={EMPLOYEE_LIST_KEY(true)} />;
  }

  return (
    <>
      <ConfirmDialog />

      <Card className="shadow-sm">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Employees</h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage employee master data and continue to employee detail.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <Checkbox
                  inputId="showDeletedData"
                  checked={isShowDeletedDataChecked}
                  onChange={(e) => setIsShowDeletedDataChecked(!!e.checked)}
                />
                <label
                  htmlFor="showDeletedData"
                  className="cursor-pointer text-sm text-slate-700"
                >
                  Show deleted data
                </label>
              </div>

              <IconField iconPosition="left">
                <InputIcon className="pi pi-search" />
                <InputText
                  value={globalFilterValue}
                  onChange={onGlobalFilterChange}
                  placeholder="Search employee"
                  className="w-full sm:w-64"
                />
              </IconField>

              <Button
                label="New Employee"
                icon="pi pi-plus"
                onClick={openNew}
              />
            </div>
          </div>

          <DataTable
            value={employeesData ?? []}
            stripedRows
            paginator
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            dataKey="id"
            filters={filters}
            globalFilterFields={[
              "code",
              "first_name",
              "middle_name",
              "last_name",
              "full_name",
              "gender_name",
              "agency_name",
              "branch_name",
              "department_name",
              "position_name",
            ]}
            emptyMessage="No employees found."
            scrollable
            tableStyle={{ minWidth: "72rem" }}
          >
            <Column
              header="#"
              body={(_, options) => options.rowIndex + 1}
              style={{ width: "60px" }}
            />
            <Column field="code" header="Code" style={{ minWidth: "100px" }} />
            <Column
              header="Full Name"
              body={fullNameBody}
              style={{ minWidth: "220px" }}
            />
            <Column
              field="gender_name"
              header="Gender"
              style={{ minWidth: "120px" }}
            />
            <Column
              field="agency_name"
              header="Agency"
              style={{ minWidth: "140px" }}
            />
            <Column
              field="branch_name"
              header="Branch"
              style={{ minWidth: "140px" }}
            />
            <Column
              field="department_name"
              header="Department"
              style={{ minWidth: "160px" }}
            />
            <Column
              field="position_name"
              header="Position"
              style={{ minWidth: "160px" }}
            />
            <Column
              header="Status"
              body={statusBody}
              style={{ minWidth: "110px" }}
            />
            <Column
              header="Deleted At"
              body={deletedAtBody}
              style={{ minWidth: "170px" }}
            />
            <Column
              header="Action"
              body={actionColumnBody}
              frozen
              alignFrozen="right"
              className="bg-white"
              headerClassName="bg-white"
              style={{ minWidth: "140px" }}
            />
          </DataTable>
        </div>
      </Card>

      <form onSubmit={handleSubmit(handleSubmitNew)}>
        <Dialog
          header="New Employee"
          visible={visible}
          style={{ width: "52rem", maxWidth: "95vw" }}
          onHide={hideDialog}
          breakpoints={{ "960px": "90vw", "640px": "96vw" }}
          footer={
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                label="Cancel"
                icon="pi pi-times"
                className="p-button-text"
                onClick={hideDialog}
              />
              <Button
                type="submit"
                label={isSubmitting ? "Saving..." : "Save"}
                icon="pi pi-check"
                disabled={isSubmitting}
              />
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-5 pt-2 md:grid-cols-2">
            <Controller
              name="first_name"
              control={control}
              rules={{ required: "First name is required" }}
              render={({ field }) => (
                <div>
                  <label htmlFor="first_name" className="mb-2 block text-sm font-medium text-slate-700">
                    First Name
                  </label>
                  <InputText
                    id="first_name"
                    {...field}
                    className={`w-full ${errors.first_name ? "p-invalid" : ""}`}
                    placeholder="Enter first name"
                  />
                  {errors.first_name && (
                    <small className="p-error">{errors.first_name.message}</small>
                  )}
                </div>
              )}
            />

            <Controller
              name="last_name"
              control={control}
              rules={{ required: "Last name is required" }}
              render={({ field }) => (
                <div>
                  <label htmlFor="last_name" className="mb-2 block text-sm font-medium text-slate-700">
                    Last Name
                  </label>
                  <InputText
                    id="last_name"
                    {...field}
                    className={`w-full ${errors.last_name ? "p-invalid" : ""}`}
                    placeholder="Enter last name"
                  />
                  {errors.last_name && (
                    <small className="p-error">{errors.last_name.message}</small>
                  )}
                </div>
              )}
            />

            <Controller
              name="birth_place"
              control={control}
              rules={{ required: "Birth place is required" }}
              render={({ field }) => (
                <div>
                  <label htmlFor="birth_place" className="mb-2 block text-sm font-medium text-slate-700">
                    Birth Place
                  </label>
                  <InputText
                    id="birth_place"
                    {...field}
                    className={`w-full ${errors.birth_place ? "p-invalid" : ""}`}
                    placeholder="Enter birth place"
                  />
                  {errors.birth_place && (
                    <small className="p-error">{errors.birth_place.message}</small>
                  )}
                </div>
              )}
            />

            <Controller
              name="dob"
              control={control}
              rules={{ required: "Date of birth is required" }}
              render={({ field }) => (
                <div>
                  <label htmlFor="dob" className="mb-2 block text-sm font-medium text-slate-700">
                    Date of Birth
                  </label>
                  <Calendar
                    id="dob"
                    appendTo={getBody}
                    value={field.value}
                    onChange={(e) => field.onChange(e.value)}
                    className={`w-full ${errors.dob ? "p-invalid" : ""}`}
                    dateFormat="dd-mm-yy"
                    showIcon
                  />
                  {errors.dob && (
                    <small className="p-error">{errors.dob.message}</small>
                  )}
                </div>
              )}
            />

            <Controller
              name="gender_id"
              control={control}
              rules={{ required: "Gender is required" }}
              render={({ field }) => (
                <div>
                  <label htmlFor="gender_id" className="mb-2 block text-sm font-medium text-slate-700">
                    Gender
                  </label>
                  <Dropdown
                    id="gender_id"
                    appendTo={getBody}
                    value={field.value}
                    options={genderActive}
                    onChange={(e) => field.onChange(e.value)}
                    optionLabel="name"
                    optionValue="id"
                    loading={genderIsLoading}
                    disabled={genderIsLoading || !!genderError}
                    placeholder="Select gender"
                    className={`w-full ${errors.gender_id ? "p-invalid" : ""}`}
                  />
                  {errors.gender_id && (
                    <small className="p-error">{errors.gender_id.message}</small>
                  )}
                </div>
              )}
            />

            <Controller
              name="religion_id"
              control={control}
              rules={{ required: "Religion is required" }}
              render={({ field }) => (
                <div>
                  <label htmlFor="religion_id" className="mb-2 block text-sm font-medium text-slate-700">
                    Religion
                  </label>
                  <Dropdown
                    id="religion_id"
                    appendTo={getBody}
                    value={field.value}
                    options={religionActive}
                    onChange={(e) => field.onChange(e.value)}
                    optionLabel="name"
                    optionValue="id"
                    loading={religionIsLoading}
                    disabled={religionIsLoading || !!religionError}
                    placeholder="Select religion"
                    className={`w-full ${errors.religion_id ? "p-invalid" : ""}`}
                  />
                  {errors.religion_id && (
                    <small className="p-error">{errors.religion_id.message}</small>
                  )}
                </div>
              )}
            />

            <Controller
              name="marital_status_id"
              control={control}
              rules={{ required: "Marital status is required" }}
              render={({ field }) => (
                <div className="md:col-span-2">
                  <label htmlFor="marital_status_id" className="mb-2 block text-sm font-medium text-slate-700">
                    Marital Status
                  </label>
                  <Dropdown
                    id="marital_status_id"
                    appendTo={getBody}
                    value={field.value}
                    options={maritalStatusActive}
                    onChange={(e) => field.onChange(e.value)}
                    optionLabel="name"
                    optionValue="id"
                    loading={maritalStatusIsLoading}
                    disabled={maritalStatusIsLoading || !!maritalStatusError}
                    placeholder="Select marital status"
                    className={`w-full ${errors.marital_status_id ? "p-invalid" : ""}`}
                  />
                  {errors.marital_status_id && (
                    <small className="p-error">{errors.marital_status_id.message}</small>
                  )}
                </div>
              )}
            />
          </div>
        </Dialog>
      </form>
    </>
  );
};

export default EmployeesDataTable;