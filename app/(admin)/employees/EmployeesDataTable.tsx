"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";

import { Employee } from "@/app/types/employee";
import { Gender } from "@/app/types/gender";
import { ReligionType } from "@/app/types/religion-type";
import { MaritalStatus } from "@/app/types/marital-status";
import {
  QuickCreateEmployeeResult,
  QuickCreateMode,
} from "@/app/types/employee-quick-create";
import {
  ResponseType,
  ResponseTypeCreateSuccess,
} from "@/app/types/response-type";

import { fetcher } from "@/app/utils/fetcher";
import { getErrorMessage, isResponseTypeError } from "@/app/utils/error-messages";

import { deleteEmployee, purgeEmployee, restoreEmployee } from "@/app/services/employee-service";
import { quickCreateEmployee } from "@/app/services/employee-quick-create-service";

import { showToast } from "@/store/ToastSlice";

import LoadingDataTable from "@/app/_components/LoadingDataTable";
import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";

import { FilterMatchMode } from "primereact/api";
import { Avatar } from "primereact/avatar";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Card } from "primereact/card";
import { Checkbox } from "primereact/checkbox";
import { Column } from "primereact/column";
import { confirmDialog, ConfirmDialog } from "primereact/confirmdialog";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { SelectButton } from "primereact/selectbutton";
import { Tag } from "primereact/tag";

type EmployeeListRow = Employee & {
  gender_name?: string | null;
  religion_name?: string | null;
  marital_status_name?: string | null;
};

type QuickCreateEmployeeForm = {
  creation_mode: QuickCreateMode;
  first_name: string;
  last_name: string;
  birth_place: string;
  dob: Date | null;
  gender_id: number | null;
  religion_id: number | null;
  marital_status_id: string;
  username: string;
  email: string;
  user_is_active: boolean;
};

const getBody = () => document.body;

const emptyQuickCreateForm: QuickCreateEmployeeForm = {
  creation_mode: "employee_only",
  first_name: "",
  last_name: "",
  birth_place: "",
  dob: null,
  gender_id: null,
  religion_id: null,
  marital_status_id: "",
  username: "",
  email: "",
  user_is_active: true,
};

const buildUsername = (firstName: string, lastName: string) => {
  const combined = `${firstName}.${lastName}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.|\.$/g, "");

  return combined || "";
};

const EmployeesDataTable = () => {
  const router = useRouter();
  const dispatch = useDispatch();

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState({
    global: { value: "", matchMode: FilterMatchMode.CONTAINS },
  });
  const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] = useState(false);

  const [visible, setVisible] = useState(false);
  const [credentialDialogVisible, setCredentialDialogVisible] = useState(false);
  const [createdResult, setCreatedResult] = useState<QuickCreateEmployeeResult | null>(null);

  const {
    control,
    handleSubmit,
    setFocus,
    formState: { isValid },
    reset,
    clearErrors,
    setValue,
    getValues,
  } = useForm<QuickCreateEmployeeForm>({
    defaultValues: emptyQuickCreateForm,
    mode: "onChange",
  });

  const creationMode = useWatch({
    control,
    name: "creation_mode",
  });

  const firstName = useWatch({
    control,
    name: "first_name",
  });

  const lastName = useWatch({
    control,
    name: "last_name",
  });

  const listKey = `/api/employees/list?show_all=${isShowDeletedDataChecked}`;

  const { data: employeesData, error, isLoading } = useSWR<EmployeeListRow[]>(
    listKey,
    fetcher
  );
  const { data: genderData, error: genderError, isLoading: genderIsLoading } =
    useSWR<Gender[]>(`/api/gender`, fetcher);
  const {
    data: religionData,
    error: religionError,
    isLoading: religionIsLoading,
  } = useSWR<ReligionType[]>(`/api/religion`, fetcher);
  const {
    data: maritalStatusData,
    error: maritalStatusError,
    isLoading: maritalStatusIsLoading,
  } = useSWR<MaritalStatus[]>(`/api/marital`, fetcher);

  const genderActive = genderData?.filter((a) => a.is_active) ?? [];
  const religionActive = religionData?.filter((a) => a.is_active) ?? [];
  const maritalStatusActive = maritalStatusData?.filter((a) => a.is_active) ?? [];

  const summary = useMemo(() => {
    const rows = employeesData ?? [];

    return {
      total: rows.length,
      active: rows.filter((item) => !item.deleted_at).length,
      deleted: rows.filter((item) => !!item.deleted_at).length,
      noOrganization: rows.filter(
        (item) => !item.position_name && !item.branch_name && !item.agency_name
      ).length,
    };
  }, [employeesData]);

  useEffect(() => {
    if (creationMode !== "employee_with_user") return;

    const currentUsername = getValues("username");
    if (currentUsername && currentUsername.trim() !== "") return;

    const generated = buildUsername(firstName ?? "", lastName ?? "");
    if (generated) {
      setValue("username", generated, {
        shouldValidate: true,
      });
    }
  }, [creationMode, firstName, lastName, getValues, setValue]);

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const nextFilters = { ...filters };
    nextFilters.global.value = value;
    setFilters(nextFilters);
    setGlobalFilterValue(value);
  };

  const onClickNew = () => {
    clearErrors();
    setVisible(true);
    reset(emptyQuickCreateForm);

    setTimeout(() => {
      setFocus("first_name");
    }, 0);
  };

  const closeDialog = () => {
    setVisible(false);
    reset(emptyQuickCreateForm);
  };

  const handleQuickCreate = async (form: QuickCreateEmployeeForm) => {
    const createUser = form.creation_mode === "employee_with_user";

    try {
      const response = await quickCreateEmployee({
        create_user: createUser,
        employee: {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          dob: form.dob ? form.dob.toISOString().slice(0, 10) : "",
          gender_id: Number(form.gender_id),
          religion_id: Number(form.religion_id),
          birth_place: form.birth_place.trim(),
          marital_status_id: form.marital_status_id,
          photo_url: null,
        },
        user: createUser
          ? {
            username: form.username.trim(),
            email: form.email.trim(),
            password: null,
            role: ["employee"],
            is_active: form.user_is_active,
          }
          : null,
      });

      await mutate(listKey);
      closeDialog();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: response.message,
        })
      );

      if (response.data?.user_created) {
        setCreatedResult(response.data);
        setCredentialDialogVisible(true);
      }
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

  const onClickDelete = (data: EmployeeListRow) => {
    confirmDialog({
      message: "Do you want to delete this record?",
      header: "Delete Confirmation",
      icon: "pi pi-info-circle",
      defaultFocus: "accept",
      acceptClassName: "p-button-danger ml-3",
      accept: () => {
        void handleDelete(data);
      },
      reject: () => { },
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

  const onClickRestore = (data: EmployeeListRow) => {
    confirmDialog({
      message: "Do you want to restore this record?",
      header: "Restore Confirmation",
      icon: "pi pi-info-circle",
      defaultFocus: "accept",
      accept: () => {
        void handleRestore(data);
      },
      reject: () => { },
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

  const onClickPurge = (data: EmployeeListRow) => {
    confirmDialog({
      message: "Do you want to delete this record forever?",
      header: "Delete Confirmation",
      icon: "pi pi-info-circle",
      defaultFocus: "accept",
      acceptClassName: "p-button-danger ml-3",
      accept: () => {
        void handlePurge(data);
      },
      reject: () => { },
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

  const handleDelete = async (data: EmployeeListRow) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await deleteEmployee(
        data.id,
        data.row_version
      );

      await mutate(listKey);

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res.message,
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

  const handlePurge = async (data: EmployeeListRow) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await purgeEmployee(
        data.id
      );

      await mutate(listKey);

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res.message,
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

  const handleRestore = async (data: EmployeeListRow) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await restoreEmployee(
        data.id,
        data.row_version
      );

      await mutate(listKey);

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res.message,
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

  const onShowDeletedDataChecked = () => {
    setIsShowDeletedDataChecked(!isShowDeletedDataChecked);
  };

  const openDetail = (data: EmployeeListRow) => {
    router.push(`/employees/${data.id}/general/personal`);
  };

  const getInitials = (rowData: EmployeeListRow) => {
    const first = rowData.first_name?.charAt(0) ?? "";
    const last = rowData.last_name?.charAt(0) ?? "";
    return `${first}${last}`.toUpperCase() || "EM";
  };

  const employeeBodyTemplate = (rowData: EmployeeListRow) => {
    const fullName =
      rowData.full_name ||
      [rowData.first_name, rowData.middle_name, rowData.last_name]
        .filter(Boolean)
        .join(" ");

    return (
      <div className="flex items-center gap-3">
        <Avatar
          label={getInitials(rowData)}
          shape="circle"
          className="bg-blue-100 text-blue-700"
          size="large"
        />
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900">{fullName}</span>
          <span className="text-sm text-slate-500">
            {rowData.code || "No employee code"}
          </span>
        </div>
      </div>
    );
  };

  const demographicBodyTemplate = (rowData: EmployeeListRow) => {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-sm text-slate-800">
          {rowData.gender_name || "-"}
          {rowData.marital_status_name ? ` • ${rowData.marital_status_name}` : ""}
        </span>
        <span className="text-sm text-slate-500">
          {rowData.birth_place || "-"}
          {rowData.dob ? ` • ${new Date(rowData.dob).toLocaleDateString()}` : ""}
        </span>
      </div>
    );
  };

  const contactBodyTemplate = (rowData: EmployeeListRow) => {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-sm text-slate-800">
          {rowData.personal_email || rowData.work_email || "-"}
        </span>
        <span className="text-sm text-slate-500">
          {rowData.phone_number || "-"}
        </span>
      </div>
    );
  };

  const organizationBodyTemplate = (rowData: EmployeeListRow) => {
    const main = rowData.position_name || rowData.department_name || "-";
    const sub = [rowData.branch_name, rowData.agency_name]
      .filter(Boolean)
      .join(" • ");

    return (
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-800">{main}</span>
        <span className="text-sm text-slate-500">{sub || "-"}</span>
      </div>
    );
  };

  const statusBodyTemplate = (rowData: EmployeeListRow) => {
    if (rowData.deleted_at) {
      return (
        <div className="flex flex-col gap-1">
          <Tag value="Deleted" severity="danger" />
          <span className="text-xs text-slate-500">
            {new Date(rowData.deleted_at).toLocaleString()}
          </span>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        <Tag value="Active" severity="success" />
        <span className="text-xs text-slate-500">Record ready</span>
      </div>
    );
  };

  const actionColumnBody = (rowData: EmployeeListRow) => {
    return (
      <div className="flex gap-2">
        <Button
          tooltipOptions={{ appendTo: () => document.body, position: "top" }}
          tooltip="detail"
          rounded
          severity="help"
          icon="pi pi-eye"
          size="small"
          onClick={() => openDetail(rowData)}
        />

        {rowData.deleted_at && (
          <Button
            tooltipOptions={{ appendTo: () => document.body, position: "top" }}
            tooltip="restore"
            rounded
            severity="success"
            icon="pi pi-refresh"
            size="small"
            onClick={() => onClickRestore(rowData)}
          />
        )}

        {!rowData.deleted_at && (
          <Button
            tooltipOptions={{ appendTo: () => document.body, position: "top" }}
            tooltip="delete"
            rounded
            severity="danger"
            icon="pi pi-trash"
            size="small"
            onClick={() => onClickDelete(rowData)}
          />
        )}

        {rowData.deleted_at && (
          <Button
            tooltipOptions={{ appendTo: () => document.body, position: "top" }}
            tooltip="delete forever"
            rounded
            severity="secondary"
            icon="pi pi-times"
            size="small"
            onClick={() => onClickPurge(rowData)}
          />
        )}
      </div>
    );
  };

  if (isLoading) return <LoadingDataTable />;
  if (error) {
    return <ErrorNotConnectedToApi mutateKey={listKey} />;
  }

  return (
    <>
      <ConfirmDialog />

      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Employees</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                  {summary.total}
                </h3>
              </div>
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <i className="pi pi-users text-xl" />
              </div>
            </div>
          </Card>

          <Card className="shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">Active Records</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                  {summary.active}
                </h3>
              </div>
              <div className="rounded-xl bg-green-50 p-3 text-green-600">
                <i className="pi pi-check-circle text-xl" />
              </div>
            </div>
          </Card>

          <Card className="shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">Deleted Records</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                  {summary.deleted}
                </h3>
              </div>
              <div className="rounded-xl bg-red-50 p-3 text-red-600">
                <i className="pi pi-trash text-xl" />
              </div>
            </div>
          </Card>

          <Card className="shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">Need Org Update</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                  {summary.noOrganization}
                </h3>
              </div>
              <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
                <i className="pi pi-briefcase text-xl" />
              </div>
            </div>
          </Card>
        </div>

        <Card className="shadow-sm">
          <div className="pt-0 pr-3 pb-3 pl-3">
            <div className="flex flex-col gap-4 pb-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col">
                <p className="text-2xl font-bold">Employees</p>
                <p className="text-md text-slate-500">
                  Manage your employee records and open detail faster
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <Checkbox
                    inputId="showDeletedData"
                    name="showDeletedData"
                    value="yes"
                    onChange={onShowDeletedDataChecked}
                    checked={isShowDeletedDataChecked}
                  />
                  <label
                    htmlFor="showDeletedData"
                    className="ml-2 cursor-pointer text-sm text-slate-700"
                  >
                    Show deleted data
                  </label>
                </div>

                <IconField iconPosition="left">
                  <InputIcon className="pi pi-search" />
                  <InputText
                    className="w-full sm:w-80"
                    value={globalFilterValue}
                    onChange={onGlobalFilterChange}
                    placeholder="Search name, code, email, branch..."
                  />
                </IconField>

                <Button label="New Employee" icon="pi pi-plus" onClick={onClickNew} />
              </div>
            </div>

            <DataTable
              value={employeesData}
              tableStyle={{ minWidth: "88rem" }}
              stripedRows
              paginator
              scrollable
              scrollHeight="560px"
              rows={10}
              rowsPerPageOptions={[10, 25, 50]}
              dataKey="id"
              rowHover
              globalFilterFields={[
                "code",
                "first_name",
                "middle_name",
                "last_name",
                "preferred_name",
                "full_name",
                "personal_email",
                "work_email",
                "phone_number",
                "gender_name",
                "birth_place",
                "agency_name",
                "branch_name",
                "department_name",
                "position_name",
              ]}
              emptyMessage="No employees found."
              filters={filters}
              currentPageReportTemplate="{first} to {last} of {totalRecords}"
              paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
              loading={isLoading}
              onRowDoubleClick={(e: any) => openDetail(e.data)}
            >
              <Column
                header="#"
                headerStyle={{ width: "3rem" }}
                body={(_, options) => options.rowIndex + 1}
              />
              <Column
                header="Employee"
                body={employeeBodyTemplate}
                style={{ minWidth: "18rem" }}
              />
              <Column
                header="Demographic"
                body={demographicBodyTemplate}
                style={{ minWidth: "14rem" }}
              />
              <Column
                header="Contact"
                body={contactBodyTemplate}
                style={{ minWidth: "16rem" }}
              />
              <Column
                header="Organization"
                body={organizationBodyTemplate}
                style={{ minWidth: "16rem" }}
              />
              <Column
                header="Status"
                body={statusBodyTemplate}
                style={{ minWidth: "10rem" }}
              />
              <Column
                headerClassName="bg-white"
                className="bg-white"
                header="Action"
                body={(rowData) => actionColumnBody(rowData)}
                frozen
                alignFrozen="right"
                style={{ minWidth: "10rem" }}
              />
            </DataTable>

            <form onSubmit={handleSubmit(handleQuickCreate)}>
              <Dialog
                header="Quick Add Employee"
                visible={visible}
                style={{ width: "60rem", maxWidth: "95vw" }}
                onHide={closeDialog}
                onShow={() => {
                  setTimeout(() => setFocus("first_name"), 0);
                }}
                breakpoints={{ "960px": "92vw", "640px": "96vw" }}
                footer={
                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      label="Cancel"
                      icon="pi pi-times"
                      onClick={closeDialog}
                      className="p-button-text"
                    />
                    <Button
                      type="submit"
                      label="Create"
                      icon="pi pi-check"
                      disabled={!isValid}
                    />
                  </div>
                }
              >
                <div className="flex flex-col gap-6">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3">
                      <p className="text-sm font-semibold text-slate-900">
                        Creation Mode
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Choose whether to create employee only or employee with login account.
                      </p>
                    </div>

                    <Controller
                      name="creation_mode"
                      control={control}
                      render={({ field }) => (
                        <SelectButton
                          {...field}
                          options={[
                            { label: "Employee Only", value: "employee_only" },
                            {
                              label: "Employee + User",
                              value: "employee_with_user",
                            },
                          ]}
                          allowEmpty={false}
                        />
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <p className="text-sm font-semibold text-slate-900">
                        Basic Information
                      </p>
                    </div>

                    <Controller
                      name="first_name"
                      control={control}
                      rules={{
                        required: "First name is required",
                        maxLength: {
                          value: 50,
                          message: "Maximum 50 characters",
                        },
                      }}
                      render={({ field, fieldState }) => (
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">
                            First Name
                          </label>
                          <InputText
                            {...field}
                            className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                            placeholder="Enter first name"
                          />
                          {fieldState.error && (
                            <small className="p-error">{fieldState.error.message}</small>
                          )}
                        </div>
                      )}
                    />

                    <Controller
                      name="last_name"
                      control={control}
                      rules={{
                        required: "Last name is required",
                        maxLength: {
                          value: 50,
                          message: "Maximum 50 characters",
                        },
                      }}
                      render={({ field, fieldState }) => (
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">
                            Last Name
                          </label>
                          <InputText
                            {...field}
                            className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                            placeholder="Enter last name"
                          />
                          {fieldState.error && (
                            <small className="p-error">{fieldState.error.message}</small>
                          )}
                        </div>
                      )}
                    />

                    <Controller
                      name="birth_place"
                      control={control}
                      rules={{
                        required: "Birth place is required",
                        maxLength: {
                          value: 50,
                          message: "Maximum 50 characters",
                        },
                      }}
                      render={({ field, fieldState }) => (
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">
                            Birth Place
                          </label>
                          <InputText
                            {...field}
                            className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                            placeholder="Enter birth place"
                          />
                          {fieldState.error && (
                            <small className="p-error">{fieldState.error.message}</small>
                          )}
                        </div>
                      )}
                    />

                    <Controller
                      name="dob"
                      control={control}
                      rules={{ required: "Birth date is required" }}
                      render={({ field, fieldState }) => (
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">
                            Birth Date
                          </label>
                          <Calendar
                            appendTo={getBody}
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
                      name="gender_id"
                      control={control}
                      rules={{
                        required: "Gender is required",
                        validate: (value) => Number(value) > 0 || "Gender is required",
                      }}
                      render={({ field, fieldState }) => (
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">
                            Gender
                          </label>
                          <Dropdown
                            appendTo={getBody}
                            value={field.value}
                            options={genderActive}
                            loading={genderIsLoading}
                            disabled={genderIsLoading || !!genderError}
                            onChange={(e) => field.onChange(e.value)}
                            optionLabel="name"
                            optionValue="id"
                            placeholder="Select gender"
                            className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                          />
                          {fieldState.error && (
                            <small className="p-error">{fieldState.error.message}</small>
                          )}
                        </div>
                      )}
                    />

                    <Controller
                      name="religion_id"
                      control={control}
                      rules={{
                        required: "Religion is required",
                        validate: (value) => Number(value) > 0 || "Religion is required",
                      }}
                      render={({ field, fieldState }) => (
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">
                            Religion
                          </label>
                          <Dropdown
                            appendTo={getBody}
                            value={field.value}
                            options={religionActive}
                            loading={religionIsLoading}
                            disabled={religionIsLoading || !!religionError}
                            onChange={(e) => field.onChange(e.value)}
                            optionLabel="name"
                            optionValue="id"
                            placeholder="Select religion"
                            className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                          />
                          {fieldState.error && (
                            <small className="p-error">{fieldState.error.message}</small>
                          )}
                        </div>
                      )}
                    />

                    <Controller
                      name="marital_status_id"
                      control={control}
                      rules={{ required: "Marital status is required" }}
                      render={({ field, fieldState }) => (
                        <div className="md:col-span-2">
                          <label className="mb-2 block text-sm font-medium text-slate-700">
                            Marital Status
                          </label>
                          <Dropdown
                            appendTo={getBody}
                            value={field.value}
                            options={maritalStatusActive}
                            disabled={maritalStatusIsLoading || !!maritalStatusError}
                            loading={maritalStatusIsLoading}
                            onChange={(e) => field.onChange(e.value)}
                            optionLabel="name"
                            optionValue="id"
                            placeholder="Select marital status"
                            className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                          />
                          {fieldState.error && (
                            <small className="p-error">{fieldState.error.message}</small>
                          )}
                        </div>
                      )}
                    />
                  </div>

                  {creationMode === "employee_with_user" && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-4">
                        <p className="text-sm font-semibold text-slate-900">
                          Login Account
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Default role will be assigned as <span className="font-semibold">employee</span>.
                          Password will be generated automatically and user must change it on first login.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <Controller
                          name="username"
                          control={control}
                          rules={{
                            validate: (value) => {
                              if (creationMode !== "employee_with_user") return true;
                              return value.trim() !== "" || "Username is required";
                            },
                          }}
                          render={({ field, fieldState }) => (
                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-700">
                                Username
                              </label>
                              <div className="flex gap-2">
                                <InputText
                                  {...field}
                                  className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                                  placeholder="Enter username"
                                />
                                <Button
                                  type="button"
                                  icon="pi pi-refresh"
                                  severity="secondary"
                                  outlined
                                  onClick={() => {
                                    const generated = buildUsername(
                                      getValues("first_name"),
                                      getValues("last_name")
                                    );
                                    setValue("username", generated, {
                                      shouldValidate: true,
                                    });
                                  }}
                                />
                              </div>
                              {fieldState.error && (
                                <small className="p-error">{fieldState.error.message}</small>
                              )}
                            </div>
                          )}
                        />

                        <Controller
                          name="email"
                          control={control}
                          rules={{
                            validate: (value) => {
                              if (creationMode !== "employee_with_user") return true;
                              if (value.trim() === "") return "Email is required";

                              const emailRegex =
                                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                              return (
                                emailRegex.test(value.trim()) || "Email format is not valid"
                              );
                            },
                          }}
                          render={({ field, fieldState }) => (
                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-700">
                                Login Email
                              </label>
                              <InputText
                                {...field}
                                className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                                placeholder="Enter login email"
                              />
                              {fieldState.error && (
                                <small className="p-error">{fieldState.error.message}</small>
                              )}
                            </div>
                          )}
                        />

                        <div className="md:col-span-2">
                          <div className="rounded-xl bg-white p-4">
                            <Controller
                              name="user_is_active"
                              control={control}
                              render={({ field }) => (
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">
                                      Active Login
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      Turn off if account should be created but not active yet.
                                    </p>
                                  </div>
                                  <InputSwitch
                                    checked={!!field.value}
                                    onChange={(e) => field.onChange(e.value)}
                                  />
                                </div>
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Dialog>
            </form>
          </div>
        </Card>
      </div>

      <Dialog
        header="Login Account Created"
        visible={credentialDialogVisible}
        style={{ width: "34rem", maxWidth: "95vw" }}
        onHide={() => setCredentialDialogVisible(false)}
        footer={
          <div className="flex justify-end">
            <Button
              label="Close"
              icon="pi pi-check"
              onClick={() => setCredentialDialogVisible(false)}
            />
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            Employee and user account were created successfully.
          </div>

          <div className="grid grid-cols-[140px_1fr] gap-3 text-sm">
            <span className="font-medium text-slate-600">Employee ID</span>
            <span className="text-slate-900">{createdResult?.employee_id ?? "-"}</span>

            <span className="font-medium text-slate-600">User ID</span>
            <span className="text-slate-900">{createdResult?.user_id ?? "-"}</span>

            <span className="font-medium text-slate-600">Username</span>
            <span className="text-slate-900">{createdResult?.username ?? "-"}</span>

            <span className="font-medium text-slate-600">Temporary Password</span>
            <span className="rounded-md bg-slate-100 px-3 py-2 font-mono text-slate-900">
              {createdResult?.temporary_password ?? "-"}
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Save this password now. User will be required to change password on first login.
          </p>
        </div>
      </Dialog>
    </>
  );
};

export default EmployeesDataTable;