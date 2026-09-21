"use client";
import { getClientLocale, translateStaticText, useI18n } from "@/app/i18n";

import { apiFetchResponse } from "@/app/utils/api-client";

import { ChangeEvent, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import useSWR from "swr";
import dayjs from "dayjs";
import * as XLSX from "@e965/xlsx";
import { saveAs } from "file-saver";
import { sanitizeSheetData } from "@/app/utils/spreadsheet-sanitizer";

import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Checkbox } from "primereact/checkbox";
import { Column } from "primereact/column";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { MultiSelect } from "primereact/multiselect";
import { Password } from "primereact/password";
import { Tag } from "primereact/tag";

import { useDispatch, useSelector } from "react-redux";

import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";

import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { useArchivedDataAccess } from "@/app/utils/archived-data-access";
import { fetcher } from "@/app/utils/fetcher";
import { hasRole } from "@/app/utils/role-utils";

import { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
};

type UserListRow = {
  id: number;
  username: string;
  email: string;

  role?: string[] | null;
  roles?: string[] | null;

  employee_id?: number | null;
  employee_name?: string | null;
  full_name?: string | null;
  name?: string | null;

  employee_code?: string | null;
  code?: string | null;

  department_name?: string | null;
  position_name?: string | null;

  is_active: boolean;
  must_change_password?: boolean;

  deleted_at?: string | null;
  row_version: number;
};

type EmployeeOptionRow = {
  id: number;

  code?: string | null;
  employee_code?: string | null;

  full_name?: string | null;
  employee_name?: string | null;

  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;

  department_name?: string | null;
  position_name?: string | null;

  deleted_at?: string | null;
};

type RoleOptionRow = {
  id?: number | string;
  name?: string | null;
  code?: string | null;
  description?: string | null;
  is_active?: boolean;
  deleted_at?: string | null;
};

type UserForm = {
  employee_id: number | null;

  username: string;
  email: string;

  role: string[];

  password: string;
  confirm_password: string;

  is_active: boolean;
};

type ProcessingAction = "delete" | "restore" | "purge" | null;

const USER_API_URL = "/api/user";

const ROLE_API_KEY = "/api/roles?show_all=false";

const EMPLOYEE_API_KEY = "/api/employees/list?show_all=false";

const EMPTY_USER_FORM: UserForm = {
  employee_id: null,

  username: "",
  email: "",

  role: [],

  password: "",
  confirm_password: "",

  is_active: true,
};

const getBody = () => document.body;

const normalizeListResponse = <T,>(response?: T[] | ApiResponse<T[]>): T[] => {
  if (!response) {
    return [];
  }

  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response.data)) {
    return response.data;
  }

  return [];
};

const parseApiError = async (response: Response) => {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json().catch(() => ({
      message: translateStaticText(
        "An unexpected error occurred.",
        getClientLocale(),
      ),
    }));
  }

  const text = await response.text().catch(() => "");

  return {
    message:
      text ||
      translateStaticText("An unexpected error occurred.", getClientLocale()),
  };
};

const getEmployeeFullName = (employee: EmployeeOptionRow) => {
  return (
    employee.full_name ||
    employee.employee_name ||
    [employee.first_name, employee.middle_name, employee.last_name]
      .filter(Boolean)
      .join(" ") ||
    `Employee #${employee.id}`
  );
};

const getUserEmployeeName = (user: UserListRow) => {
  return user.employee_name || user.full_name || user.name || "-";
};

const getEmployeeCode = (user: UserListRow) => {
  return user.employee_code || user.code || "-";
};

const getUserRoles = (user: UserListRow) => {
  const roles = Array.isArray(user.role)
    ? user.role
    : Array.isArray(user.roles)
      ? user.roles
      : [];

  return [
    ...new Set(roles.map((role) => role.trim().toLowerCase()).filter(Boolean)),
  ];
};

const formatRoleLabel = (role: string) => {
  return role
    .split("_")
    .map((part) => {
      const lower = part.toLowerCase();

      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
};

const createUserApi = async (data: UserForm) => {
  const response = await apiFetchResponse(USER_API_URL, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      employee_id: data.employee_id,

      username: data.username.trim().toLowerCase(),

      email: data.email.trim().toLowerCase(),

      role: data.role,

      password: data.password.trim(),

      is_active: Boolean(data.is_active),
    }),
  });

  if (!response.ok) {
    throw await parseApiError(response);
  }

  return response.json() as Promise<ApiResponse<unknown>>;
};

const updateUserApi = async (
  id: number,
  rowVersion: number,
  data: UserForm,
) => {
  const password = data.password.trim();

  const payload: Record<string, unknown> = {
    employee_id: data.employee_id,

    username: data.username.trim().toLowerCase(),

    email: data.email.trim().toLowerCase(),

    role: data.role,

    is_active: Boolean(data.is_active),
  };

  if (password) {
    payload.password = password;
  }

  const response = await apiFetchResponse(`${USER_API_URL}/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await parseApiError(response);
  }

  return response.json() as Promise<ApiResponse<unknown>>;
};

const deleteUserApi = async (id: number, rowVersion: number) => {
  const response = await apiFetchResponse(`${USER_API_URL}/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
  });

  if (!response.ok) {
    throw await parseApiError(response);
  }

  return response.json() as Promise<ApiResponse<unknown>>;
};

const restoreUserApi = async (id: number, rowVersion: number) => {
  const response = await apiFetchResponse(`${USER_API_URL}/${id}/restore`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
  });

  if (!response.ok) {
    throw await parseApiError(response);
  }

  return response.json() as Promise<ApiResponse<unknown>>;
};

const purgeUserApi = async (id: number) => {
  const response = await apiFetchResponse(`${USER_API_URL}/${id}/purge`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw await parseApiError(response);
  }

  return response.json() as Promise<ApiResponse<unknown>>;
};

const UserTableData = () => {
  const { t: i18nT } = useI18n();
  const dispatch = useDispatch();

  const profileState = useSelector((state: RootState) => state.profile);
  const archivedAccess = useArchivedDataAccess("user");

  const profileRecord = profileState as unknown as Record<string, unknown>;

  const currentUserId = Number(profileRecord.user_id ?? profileRecord.id ?? 0);

  const isSuperadmin = hasRole(profileState.role, ["superadmin"]);
  const userPermissions = new Set(profileState.permissions);
  const canCreateUser = userPermissions.has("user.create");
  const canUpdateUser = userPermissions.has("user.update");
  const canDeleteUser = userPermissions.has("user.delete");
  const canRestoreUser = archivedAccess.canRestore;
  const canPurgeUser = archivedAccess.canPurge;

  const [showDeleted, setShowDeleted] = useState(false);

  const [globalFilterValue, setGlobalFilterValue] = useState("");

  const [filters, setFilters] = useState({
    global: {
      value: "",
      matchMode: FilterMatchMode.CONTAINS,
    },
  });

  const [selectedData, setSelectedData] = useState<UserListRow | null>(null);

  const [dialogVisible, setDialogVisible] = useState(false);

  const [isAddNew, setIsAddNew] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const [isExporting, setIsExporting] = useState(false);

  const [processingRowId, setProcessingRowId] = useState<number | null>(null);

  const [processingAction, setProcessingAction] =
    useState<ProcessingAction>(null);

  const userKey = `${USER_API_URL}?show_all=${
    archivedAccess.canShowDeleted && showDeleted
  }`;

  const {
    data: userResponse,
    error,
    isLoading,
    isValidating,
    mutate: refreshUserData,
  } = useSWR<UserListRow[] | ApiResponse<UserListRow[]>>(userKey, fetcher, {
    revalidateOnFocus: false,
  });

  const {
    data: employeeResponse,
    isLoading: employeeIsLoading,
    error: employeeError,
    mutate: refreshEmployeeData,
  } = useSWR<EmployeeOptionRow[] | ApiResponse<EmployeeOptionRow[]>>(
    EMPLOYEE_API_KEY,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  const {
    data: roleResponse,
    isLoading: roleIsLoading,
    error: roleError,
    mutate: refreshRoleData,
  } = useSWR<RoleOptionRow[] | ApiResponse<RoleOptionRow[]>>(
    ROLE_API_KEY,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  const {
    control,
    handleSubmit,
    reset,
    setFocus,
    getValues,
    formState: { errors },
  } = useForm<UserForm>({
    defaultValues: EMPTY_USER_FORM,
    mode: "onTouched",
  });

  const rawUserRows = useMemo(() => {
    return normalizeListResponse(userResponse);
  }, [userResponse]);

  const employeeRows = useMemo(() => {
    return normalizeListResponse(employeeResponse);
  }, [employeeResponse]);

  const employeeById = useMemo(() => {
    return new Map(
      employeeRows.map((employee) => [Number(employee.id), employee]),
    );
  }, [employeeRows]);

  const rows = useMemo<UserListRow[]>(() => {
    return rawUserRows.map((user) => {
      const employeeId =
        user.employee_id != null ? Number(user.employee_id) : null;

      const employee =
        employeeId != null ? employeeById.get(employeeId) : undefined;

      if (!employee) {
        return user;
      }

      return {
        ...user,

        employee_name:
          user.employee_name ||
          user.full_name ||
          employee.full_name ||
          employee.employee_name ||
          [employee.first_name, employee.middle_name, employee.last_name]
            .filter(Boolean)
            .join(" ") ||
          null,

        employee_code:
          user.employee_code ||
          user.code ||
          employee.employee_code ||
          employee.code ||
          null,

        department_name:
          user.department_name || employee.department_name || null,

        position_name: user.position_name || employee.position_name || null,
      };
    });
  }, [rawUserRows, employeeById]);

  const roleRows = normalizeListResponse(roleResponse);

  const employeeOptions = useMemo(() => {
    return employeeRows
      .filter((employee) => !employee.deleted_at)
      .map((employee) => {
        const employeeCode = employee.employee_code || employee.code || "-";

        const employeeName = getEmployeeFullName(employee);

        const organization = [employee.department_name, employee.position_name]
          .filter(Boolean)
          .join(" • ");

        return {
          label: organization
            ? i18nT("static.v5lfdh", {
                p0: employeeName,
                p1: employeeCode,
                p2: organization,
              })
            : i18nT("static.14r9r1n", { p0: employeeName, p1: employeeCode }),

          value: employee.id,
        };
      })
      .sort((first, second) =>
        (first.label ?? "").localeCompare(second.label ?? "", "id"),
      );
  }, [employeeRows]);

  const roleOptions = useMemo(() => {
    return roleRows
      .filter((role) => !role.deleted_at && role.is_active !== false)
      .map((role) => {
        // User assignments and the authorization layer use role codes. Using
        // the display name here causes an existing assignment such as
        // `admin`/`approver` not to match the MultiSelect option value.
        const value = role.code?.trim().toLowerCase() || "";

        return {
          label: role.name || role.description || formatRoleLabel(value),

          value,
        };
      })
      .filter((role) => role.value.trim() !== "")
      .sort((first, second) =>
        (first.label ?? "").localeCompare(second.label ?? ""),
      );
  }, [roleRows]);

  const summary = useMemo(() => {
    const existingRows = rows.filter((user) => !user.deleted_at);

    return {
      total: existingRows.length,

      active: existingRows.filter((user) => user.is_active).length,

      inactive: existingRows.filter((user) => !user.is_active).length,

      deleted: rows.filter((user) => Boolean(user.deleted_at)).length,

      linkedEmployee: existingRows.filter((user) => Boolean(user.employee_id))
        .length,
    };
  }, [rows]);

  const isProcessing = processingRowId !== null;

  const isEditingSelf = selectedData?.id === currentUserId;

  const showSuccess = (message: string) => {
    dispatch(
      showToast({
        visible: true,
        severity: "success",
        summary: i18nT("static.udvru8"),
        detail: message,
      }),
    );
  };

  const showWarning = (message: string) => {
    dispatch(
      showToast({
        visible: true,
        severity: "warn",
        summary: i18nT("static.fh2d8v"),
        detail: message,
      }),
    );
  };

  const showError = (err: unknown) => {
    if (isResponseTypeError(err)) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: i18nT("static.1vks92p"),
          detail: getErrorMessage(err, "message"),
        }),
      );

      return;
    }

    if (err instanceof Error) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: i18nT("static.1vks92p"),
          detail: err.message,
        }),
      );

      return;
    }

    if (typeof err === "object" && err !== null) {
      const errorRecord = err as Record<string, unknown>;

      const message = errorRecord.message ?? errorRecord.error;

      if (typeof message === "string") {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: i18nT("static.1vks92p"),
            detail: message,
          }),
        );

        return;
      }
    }

    dispatch(
      showToast({
        visible: true,
        severity: "error",
        summary: i18nT("static.1vks92p"),
        detail: i18nT("static.37lwsc"),
      }),
    );
  };

  const handleRefresh = async () => {
    try {
      await Promise.all([
        refreshUserData(),
        refreshEmployeeData(),
        refreshRoleData(),
      ]);
    } catch (err: unknown) {
      showError(err);
    }
  };

  const onGlobalFilterChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;

    setGlobalFilterValue(value);

    setFilters({
      global: {
        value,
        matchMode: FilterMatchMode.CONTAINS,
      },
    });
  };

  const openNew = () => {
    setSelectedData(null);
    setIsAddNew(true);

    reset(EMPTY_USER_FORM);

    setDialogVisible(true);
  };

  const openEdit = (data: UserListRow) => {
    if (data.deleted_at) {
      showWarning(i18nT("static.dhw6j4"));

      return;
    }

    setSelectedData(data);
    setIsAddNew(false);

    reset({
      employee_id: data.employee_id ?? null,

      username: data.username ?? "",

      email: data.email ?? "",

      role: getUserRoles(data),

      password: "",
      confirm_password: "",

      is_active: Boolean(data.is_active),
    });

    setDialogVisible(true);
  };

  const resetDialogState = () => {
    setDialogVisible(false);
    setSelectedData(null);
    setIsAddNew(false);

    reset(EMPTY_USER_FORM);
  };

  const closeDialog = () => {
    if (isSaving) {
      return;
    }

    resetDialogState();
  };

  const handleSave = async (formData: UserForm) => {
    if (isSaving) {
      return;
    }

    if (roleError || employeeError) {
      showError(new Error("User reference data could not be loaded."));

      return;
    }

    if (isEditingSelf && !formData.is_active) {
      showWarning(i18nT("static.1w2rugp"));

      return;
    }

    if (
      isEditingSelf &&
      isSuperadmin &&
      !formData.role.some((role) => role.toLowerCase() === "superadmin")
    ) {
      showWarning(i18nT("static.wv9wyq"));

      return;
    }

    try {
      setIsSaving(true);

      let response: ApiResponse<unknown> | undefined;

      if (isAddNew) {
        response = await createUserApi(formData);
      } else if (selectedData) {
        response = await updateUserApi(
          selectedData.id,
          selectedData.row_version,
          formData,
        );
      }

      await refreshUserData();

      showSuccess(
        response?.message ||
          (isAddNew ? i18nT("static.1b2yy07") : i18nT("static.18bfjg")),
      );

      /*
       * Jangan memanggil
       * closeDialog() saat
       * isSaving masih true.
       */
      resetDialogState();
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (data: UserListRow) => {
    if (data.id === currentUserId) {
      showWarning(i18nT("static.116d1co"));

      return;
    }

    try {
      setProcessingRowId(data.id);
      setProcessingAction("delete");

      const response = await deleteUserApi(data.id, data.row_version);

      await refreshUserData();

      showSuccess(response.message || i18nT("static.t15gxy"));
    } catch (err: unknown) {
      showError(err);
    } finally {
      setProcessingRowId(null);
      setProcessingAction(null);
    }
  };

  const handleRestore = async (data: UserListRow) => {
    try {
      setProcessingRowId(data.id);
      setProcessingAction("restore");

      const response = await restoreUserApi(data.id, data.row_version);

      await refreshUserData();

      showSuccess(response.message || i18nT("static.1xcm76p"));
    } catch (err: unknown) {
      showError(err);
    } finally {
      setProcessingRowId(null);
      setProcessingAction(null);
    }
  };

  const handlePurge = async (data: UserListRow) => {
    if (!data.deleted_at) {
      showWarning(i18nT("static.1nbdvf6"));

      return;
    }

    if (data.id === currentUserId) {
      showWarning(i18nT("static.wyvykb"));

      return;
    }

    try {
      setProcessingRowId(data.id);
      setProcessingAction("purge");

      const response = await purgeUserApi(data.id);

      await refreshUserData();

      showSuccess(response.message || i18nT("static.1cewgx4"));
    } catch (err: unknown) {
      showError(err);
    } finally {
      setProcessingRowId(null);
      setProcessingAction(null);
    }
  };

  const onClickDelete = (data: UserListRow) => {
    requestActionConfirmation({
      header: i18nT("static.y4gqs1"),

      message: (
        <div className="flex flex-col gap-2">
          <span className="text-slate-600">{i18nT("static.o1513z")}</span>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="m-0 text-sm font-semibold text-slate-800">
              {getUserEmployeeName(data)}
            </p>

            <p className="m-0 mt-1 text-xs text-slate-500">
              {data.username} {i18nT("static.syyan8")} {data.email}
            </p>
          </div>
        </div>
      ),

      icon: "pi pi-exclamation-triangle",

      defaultFocus: "reject",

      accept: () => {
        void handleDelete(data);
      },

      reject: () => undefined,

      footer: (options) => (
        <div className="flex justify-end gap-2 sm:gap-3">
          <Button
            type="button"
            label={i18nT("static.ew9em3")}
            icon="pi pi-times"
            text
            severity="secondary"
            onClick={options.reject}
          />

          <Button
            type="button"
            label={i18nT("static.oay2cq")}
            icon="pi pi-trash"
            severity="danger"
            onClick={options.accept}
          />
        </div>
      ),
    });
  };

  const onClickRestore = (data: UserListRow) => {
    requestActionConfirmation({
      header: i18nT("static.1qai8dc"),

      message: i18nT("static.zyffce"),

      icon: "pi pi-refresh",

      defaultFocus: "accept",

      accept: () => {
        void handleRestore(data);
      },

      reject: () => undefined,
    });
  };

  const onClickPurge = (data: UserListRow) => {
    requestActionConfirmation({
      header: i18nT("static.1xeocf8"),

      message: (
        <div className="flex flex-col gap-2">
          <span className="text-slate-600">{i18nT("static.1g8j1g8")} </span>

          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="m-0 text-sm font-semibold text-red-800">
              {data.username}
            </p>

            <p className="m-0 mt-1 text-xs text-red-600">{data.email}</p>
          </div>
        </div>
      ),

      icon: "pi pi-exclamation-triangle",

      defaultFocus: "reject",

      accept: () => {
        void handlePurge(data);
      },

      reject: () => undefined,

      footer: (options) => (
        <div className="flex justify-end gap-2 sm:gap-3">
          <Button
            type="button"
            label={i18nT("static.ew9em3")}
            icon="pi pi-times"
            text
            severity="secondary"
            onClick={options.reject}
          />

          <Button
            type="button"
            label={i18nT("static.1wopxwj")}
            icon="pi pi-trash"
            severity="danger"
            onClick={options.accept}
          />
        </div>
      ),
    });
  };

  const exportExistingUsers = () => {
    if (isExporting) {
      return;
    }

    try {
      setIsExporting(true);

      /*
       * Export seluruh user
       * non-delete dari data API,
       * tidak mengikuti pencarian
       * DataTable.
       */
      const existingUsers = rows
        .filter((user) => !user.deleted_at)
        .sort((first, second) =>
          getUserEmployeeName(first).localeCompare(
            getUserEmployeeName(second),
            "id",
          ),
        );

      if (existingUsers.length === 0) {
        showWarning(i18nT("static.1by0s62"));

        return;
      }

      const excelRows = existingUsers.map((user, index) => ({
        No: index + 1,

        Name: getUserEmployeeName(user),

        "Employee Code": getEmployeeCode(user),

        Department: user.department_name || "-",

        Position: user.position_name || "-",

        Email: user.email || "-",
      }));

      const worksheet = XLSX.utils.json_to_sheet(sanitizeSheetData(excelRows));

      worksheet["!cols"] = [
        { wch: 6 },
        { wch: 32 },
        { wch: 18 },
        { wch: 30 },
        { wch: 30 },
        { wch: 38 },
      ];

      worksheet["!autofilter"] = {
        ref: `A1:F${excelRows.length + 1}`,
      };

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(workbook, worksheet, "Existing Users");

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      const fileBlob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const fileName = `existing_users_${dayjs().format(
        "YYYYMMDD_HHmmss",
      )}.xlsx`;

      saveAs(fileBlob, fileName);

      showSuccess(i18nT("static.1oqmn30", { p0: existingUsers.length }));
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsExporting(false);
    }
  };

  const userBody = (rowData: UserListRow) => {
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-sm font-semibold text-slate-800">
          {rowData.username}
        </span>

        <span className="truncate text-xs text-slate-500">
          {rowData.email || "-"}
        </span>
      </div>
    );
  };

  const employeeBody = (rowData: UserListRow) => {
    const employeeName = getUserEmployeeName(rowData);

    if (employeeName === "-" && !rowData.employee_id) {
      return <Tag value={i18nT("static.1auoutz")} severity="warning" rounded />;
    }

    return (
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-sm font-medium text-slate-800">
          {employeeName}
        </span>

        <span className="font-mono text-xs text-slate-500">
          {getEmployeeCode(rowData)}
        </span>
      </div>
    );
  };

  const organizationBody = (rowData: UserListRow) => {
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-sm font-medium text-slate-700">
          {rowData.department_name || "-"}
        </span>

        <span className="truncate text-xs text-slate-500">
          {rowData.position_name || "-"}
        </span>
      </div>
    );
  };

  const roleBody = (rowData: UserListRow) => {
    const roles = getUserRoles(rowData);

    if (roles.length === 0) {
      return (
        <span className="text-sm text-slate-400">{i18nT("static.svp9iu")}</span>
      );
    }

    return (
      <div className="flex max-w-sm flex-wrap gap-1">
        {roles.map((role) => (
          <Tag
            key={role}
            value={formatRoleLabel(role)}
            severity={
              role.toLowerCase() === "superadmin"
                ? "danger"
                : role.toLowerCase() === "admin"
                  ? "warning"
                  : "info"
            }
            rounded
          />
        ))}
      </div>
    );
  };

  const activeBody = (rowData: UserListRow) => {
    if (rowData.deleted_at) {
      return (
        <Tag
          value={i18nT("static.1v6qcju")}
          severity="danger"
          icon="pi pi-trash"
          rounded
        />
      );
    }

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
        severity="secondary"
        icon="pi pi-ban"
        rounded
      />
    );
  };

  const passwordStatusBody = (rowData: UserListRow) => {
    return rowData.must_change_password ? (
      <Tag value={i18nT("static.1ypcei8")} severity="warning" rounded />
    ) : (
      <Tag value={i18nT("static.onobjm")} severity="success" rounded />
    );
  };

  const actionBody = (rowData: UserListRow) => {
    const isCurrentRow = processingRowId === rowData.id;

    if (rowData.deleted_at) {
      if (!canRestoreUser && !canPurgeUser) {
        return (
          <span className="text-sm text-slate-400">
            {i18nT("static.yaeuo4")}
          </span>
        );
      }

      return (
        <div className="flex flex-nowrap justify-end gap-2">
          {canRestoreUser && (
            <Button
              type="button"
              icon="pi pi-refresh"
              rounded
              outlined
              size="small"
              severity="success"
              loading={isCurrentRow && processingAction === "restore"}
              disabled={isProcessing}
              tooltip={i18nT("static.4fiyr5")}
              tooltipOptions={{
                appendTo: getBody,
                position: "top",
              }}
              onClick={() => onClickRestore(rowData)}
            />
          )}

          {canPurgeUser && (
            <Button
              type="button"
              icon="pi pi-trash"
              rounded
              outlined
              size="small"
              severity="danger"
              loading={isCurrentRow && processingAction === "purge"}
              disabled={isProcessing}
              tooltip={i18nT("static.1ny6sg3")}
              tooltipOptions={{
                appendTo: getBody,
                position: "top",
              }}
              onClick={() => onClickPurge(rowData)}
            />
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-nowrap justify-end gap-2">
        {canUpdateUser && (
          <Button
            type="button"
            icon="pi pi-pencil"
            rounded
            outlined
            size="small"
            severity="help"
            disabled={isProcessing}
            tooltip={i18nT("static.1i1lcq9")}
            tooltipOptions={{
              appendTo: getBody,
              position: "top",
            }}
            onClick={() => openEdit(rowData)}
          />
        )}

        {canDeleteUser && (
          <Button
            type="button"
            icon="pi pi-trash"
            rounded
            outlined
            size="small"
            severity="danger"
            loading={isCurrentRow && processingAction === "delete"}
            disabled={isProcessing || rowData.id === currentUserId}
            tooltip={
              rowData.id === currentUserId
                ? i18nT("static.104pq5i")
                : i18nT("static.oay2cq")
            }
            tooltipOptions={{
              appendTo: getBody,
              position: "top",
            }}
            onClick={() => onClickDelete(rowData)}
          />
        )}
      </div>
    );
  };

  const rowClassName = (rowData: UserListRow) => {
    if (rowData.deleted_at) {
      return "bg-red-50/20 text-slate-500";
    }

    if (!rowData.is_active) {
      return "bg-slate-50";
    }

    if (!rowData.employee_id) {
      return "bg-amber-50/30";
    }

    return "";
  };

  const dialogFooter = (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
      <Button
        type="button"
        label={i18nT("static.ew9em3")}
        icon="pi pi-times"
        text
        severity="secondary"
        disabled={isSaving}
        className="w-full sm:w-auto"
        onClick={closeDialog}
      />

      <Button
        type="submit"
        form="user-form"
        label={isAddNew ? i18nT("static.1pjr6lw") : i18nT("static.6gmm1l")}
        icon="pi pi-check"
        loading={isSaving}
        disabled={
          isSaving || roleIsLoading || employeeIsLoading || Boolean(roleError)
        }
        className="w-full sm:w-auto"
      />
    </div>
  );

  if (isLoading) {
    return <LoadingDataTable />;
  }

  if (error) {
    return <ErrorNotConnectedToApi mutateKey={userKey} />;
  }

  return (
    <>
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
          {/* Header */}
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:flex">
                <i className="pi pi-users text-xl" />
              </div>

              <div className="min-w-0">
                <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
                  {i18nT("static.1uyoj7")}{" "}
                </h1>

                <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                  {i18nT("static.pqgt4m")}{" "}
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
              {canCreateUser && (
                <Button
                  type="button"
                  label={i18nT("static.28r6qc")}
                  icon="pi pi-refresh"
                  severity="secondary"
                  outlined
                  size="small"
                  loading={isValidating}
                  disabled={
                    isValidating || isProcessing || isSaving || isExporting
                  }
                  className="w-full sm:w-auto"
                  onClick={handleRefresh}
                />
              )}

              <Button
                type="button"
                label={i18nT("static.1tpgeic")}
                icon="pi pi-file-excel"
                severity="success"
                outlined
                size="small"
                loading={isExporting}
                disabled={
                  isExporting ||
                  isLoading ||
                  rows.filter((user) => !user.deleted_at).length === 0
                }
                className="w-full sm:w-auto"
                onClick={exportExistingUsers}
              />

              {canCreateUser && (
                <Button
                  type="button"
                  label={i18nT("static.1okrgyo")}
                  icon="pi pi-plus"
                  size="small"
                  disabled={isProcessing || isSaving || isExporting}
                  className="w-full sm:w-auto"
                  onClick={openNew}
                />
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="m-0 text-xs text-slate-500">
                {i18nT("static.18sjugc")}
              </p>

              <p className="m-0 mt-1 text-2xl font-semibold text-slate-800">
                {summary.total}
              </p>
            </div>

            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="m-0 text-xs text-green-700">
                {i18nT("static.8qzyhb")}
              </p>

              <p className="m-0 mt-1 text-2xl font-semibold text-green-800">
                {summary.active}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="m-0 text-xs text-slate-600">
                {i18nT("static.13zf5vc")}
              </p>

              <p className="m-0 mt-1 text-2xl font-semibold text-slate-800">
                {summary.inactive}
              </p>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="m-0 text-xs text-blue-700">
                {i18nT("static.8nok09")}
              </p>

              <p className="m-0 mt-1 text-2xl font-semibold text-blue-800">
                {summary.linkedEmployee}
              </p>
            </div>
          </div>

          {/* Search */}
          <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
            {archivedAccess.canShowDeleted ? (
              <div className="flex items-center gap-2">
                <Checkbox
                  inputId="show_deleted_users"
                  checked={showDeleted}
                  onChange={(event) => setShowDeleted(Boolean(event.checked))}
                />

                <label
                  htmlFor="show_deleted_users"
                  className="cursor-pointer text-sm text-slate-600"
                >
                  {i18nT("static.52im6x")}{" "}
                </label>
              </div>
            ) : (
              <span className="text-xs text-slate-500">
                {i18nT("static.115o3ye")}{" "}
              </span>
            )}

            <IconField iconPosition="left" className="w-full md:w-96">
              <InputIcon className="pi pi-search" />

              <InputText
                value={globalFilterValue}
                onChange={onGlobalFilterChange}
                placeholder={i18nT("static.ztctil")}
                className="w-full"
              />
            </IconField>
          </section>

          {/* Table */}
          <div className="w-full overflow-hidden">
            <DataTable
              value={rows}
              dataKey="id"
              filters={filters}
              globalFilterFields={[
                "username",
                "email",
                "employee_name",
                "full_name",
                "name",
                "employee_code",
                "code",
                "department_name",
                "position_name",
                "role",
                "roles",
              ]}
              paginator
              rows={10}
              rowsPerPageOptions={[10, 25, 50]}
              stripedRows
              rowHover
              scrollable
              removableSort
              responsiveLayout="scroll"
              size="small"
              loading={isValidating}
              rowClassName={rowClassName}
              tableStyle={{
                minWidth: "100rem",
              }}
              emptyMessage={i18nT("static.ne5bpb")}
              currentPageReportTemplate={i18nT("static.1kqh8lr")}
              paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            >
              <Column
                header="#"
                body={(_, options) => options.rowIndex + 1}
                headerStyle={{
                  width: "4rem",
                }}
                bodyStyle={{
                  width: "4rem",
                }}
              />

              <Column
                field="username"
                header={i18nT("static.1r69so9")}
                sortable
                body={userBody}
                style={{
                  minWidth: "19rem",
                }}
              />

              <Column
                field="employee_name"
                header={i18nT("static.1fak8xt")}
                sortable
                body={employeeBody}
                style={{
                  minWidth: "20rem",
                }}
              />

              <Column
                field="department_name"
                header={i18nT("static.725tl6")}
                sortable
                body={organizationBody}
                style={{
                  minWidth: "20rem",
                }}
              />

              <Column
                header={i18nT("static.hbz43i")}
                body={roleBody}
                style={{
                  minWidth: "20rem",
                }}
              />

              <Column
                field="is_active"
                header={i18nT("static.1tebuhq")}
                sortable
                body={activeBody}
                style={{
                  minWidth: "13rem",
                }}
              />

              <Column
                field="must_change_password"
                header={i18nT("static.19tog22")}
                sortable
                body={passwordStatusBody}
                style={{
                  minWidth: "14rem",
                }}
              />

              <Column
                header={i18nT("static.2wk0tb")}
                body={actionBody}
                frozen
                alignFrozen="right"
                headerClassName="bg-white"
                className="bg-white"
                headerStyle={{
                  width: "10rem",
                  minWidth: "10rem",
                  textAlign: "right",
                }}
                bodyStyle={{
                  width: "10rem",
                  minWidth: "10rem",
                }}
              />
            </DataTable>
          </div>
        </div>
      </Card>

      {/* User Form */}
      <Dialog
        header={isAddNew ? i18nT("static.1okrgyo") : i18nT("static.171of4w")}
        visible={dialogVisible}
        style={{
          width: "95vw",
          maxWidth: "48rem",
        }}
        breakpoints={{
          "960px": "95vw",
        }}
        footer={dialogFooter}
        modal
        draggable={false}
        resizable={false}
        closable={!isSaving}
        closeOnEscape={!isSaving}
        onHide={closeDialog}
        onShow={() => {
          setTimeout(() => {
            setFocus("username");
          }, 0);
        }}
      >
        <form
          id="user-form"
          onSubmit={handleSubmit(handleSave)}
          className="flex flex-col gap-5 pt-2"
        >
          {(roleError || employeeError) && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <i className="pi pi-exclamation-circle mt-0.5" />

              <span>{i18nT("static.135r4bx")} </span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-2 md:col-span-2">
              <label
                htmlFor="employee_id"
                className="text-sm font-medium text-slate-700"
              >
                {i18nT("static.1fak8xt")}{" "}
              </label>

              <Controller
                name="employee_id"
                control={control}
                render={({ field }) => (
                  <Dropdown
                    id="employee_id"
                    appendTo={getBody}
                    value={field.value}
                    options={employeeOptions}
                    optionLabel="label"
                    optionValue="value"
                    placeholder={i18nT("static.1izgm0n")}
                    filter
                    showClear
                    loading={employeeIsLoading}
                    disabled={
                      isSaving || employeeIsLoading || Boolean(employeeError)
                    }
                    className="w-full"
                    onChange={(event) => field.onChange(event.value ?? null)}
                  />
                )}
              />

              <small className="text-slate-500">
                {i18nT("static.1shsfnk")}{" "}
              </small>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="username"
                className="text-sm font-medium text-slate-700"
              >
                {i18nT("static.7s11ax")}{" "}
                <span className="ml-1 text-red-500">*</span>
              </label>

              <Controller
                name="username"
                control={control}
                rules={{
                  required: i18nT("static.1d43s9u"),

                  minLength: {
                    value: 3,
                    message: i18nT("static.1ejvsud"),
                  },

                  maxLength: {
                    value: 50,
                    message: i18nT("static.1wlrshb"),
                  },

                  pattern: {
                    value: /^[a-zA-Z0-9._-]+$/,
                    message: i18nT("static.1sf635t"),
                  },
                }}
                render={({ field, fieldState }) => (
                  <>
                    <InputText
                      {...field}
                      id="username"
                      value={field.value ?? ""}
                      autoComplete="off"
                      disabled={isSaving}
                      placeholder={i18nT("static.11nba67")}
                      className={`w-full ${
                        fieldState.invalid ? "p-invalid" : ""
                      }`}
                      onChange={(event) =>
                        field.onChange(event.target.value.toLowerCase())
                      }
                    />

                    {fieldState.error && (
                      <small className="p-error">
                        {fieldState.error.message}
                      </small>
                    )}
                  </>
                )}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-slate-700"
              >
                {i18nT("static.inbfc7")}{" "}
                <span className="ml-1 text-red-500">*</span>
              </label>

              <Controller
                name="email"
                control={control}
                rules={{
                  required: i18nT("static.19ve3zw"),

                  maxLength: {
                    value: 254,
                    message: i18nT("static.agitfb"),
                  },

                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: i18nT("static.10qqhm1"),
                  },
                }}
                render={({ field, fieldState }) => (
                  <>
                    <InputText
                      {...field}
                      id="email"
                      type="email"
                      value={field.value ?? ""}
                      autoComplete="off"
                      disabled={isSaving}
                      placeholder={i18nT("static.12p78my")}
                      className={`w-full ${
                        fieldState.invalid ? "p-invalid" : ""
                      }`}
                      onChange={(event) =>
                        field.onChange(event.target.value.toLowerCase())
                      }
                    />

                    {fieldState.error && (
                      <small className="p-error">
                        {fieldState.error.message}
                      </small>
                    )}
                  </>
                )}
              />
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <label
                htmlFor="role"
                className="text-sm font-medium text-slate-700"
              >
                {i18nT("static.hbz43i")}{" "}
                <span className="ml-1 text-red-500">*</span>
              </label>

              <Controller
                name="role"
                control={control}
                rules={{
                  validate: (value) =>
                    value.length > 0 || "At least one role is required.",
                }}
                render={({ field, fieldState }) => (
                  <>
                    <MultiSelect
                      inputId="role"
                      appendTo={getBody}
                      value={field.value}
                      options={roleOptions}
                      optionLabel="label"
                      optionValue="value"
                      placeholder={i18nT("static.vis8kw")}
                      filter
                      display="chip"
                      loading={roleIsLoading}
                      disabled={isSaving || roleIsLoading || Boolean(roleError)}
                      className={`w-full ${
                        fieldState.invalid ? "p-invalid" : ""
                      }`}
                      onChange={(event) => field.onChange(event.value ?? [])}
                    />

                    {fieldState.error && (
                      <small className="p-error">
                        {fieldState.error.message}
                      </small>
                    )}
                  </>
                )}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-slate-700"
              >
                {i18nT("static.cf437c")}{" "}
                {isAddNew && <span className="ml-1 text-red-500">*</span>}
              </label>

              <Controller
                name="password"
                control={control}
                rules={{
                  validate: (value) => {
                    if (isAddNew && !value.trim()) {
                      return i18nT("Password is required.");
                    }

                    if (
                      value &&
                      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,128}$/.test(
                        value,
                      )
                    ) {
                      return i18nT(
                        "Use 12-128 characters with uppercase, lowercase, number, and symbol.",
                      );
                    }

                    return true;
                  },
                }}
                render={({ field, fieldState }) => (
                  <>
                    <Password
                      inputId="password"
                      value={field.value}
                      feedback={isAddNew}
                      toggleMask
                      disabled={isSaving}
                      autoComplete="new-password"
                      placeholder={
                        isAddNew
                          ? i18nT("static.1quldxa")
                          : i18nT("static.1073aa3")
                      }
                      className="w-full"
                      inputClassName={`w-full ${
                        fieldState.invalid ? "p-invalid" : ""
                      }`}
                      onChange={(event) => field.onChange(event.target.value)}
                    />

                    {fieldState.error && (
                      <small className="p-error">
                        {fieldState.error.message}
                      </small>
                    )}
                  </>
                )}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="confirm_password"
                className="text-sm font-medium text-slate-700"
              >
                {i18nT("static.1xwndc0")}{" "}
                {isAddNew && <span className="ml-1 text-red-500">*</span>}
              </label>

              <Controller
                name="confirm_password"
                control={control}
                rules={{
                  validate: (value) => {
                    const password = getValues("password");

                    if (isAddNew && !value.trim()) {
                      return i18nT("Password confirmation is required.");
                    }

                    if (password || value) {
                      return (
                        password === value ||
                        "Password confirmation does not match."
                      );
                    }

                    return true;
                  },
                }}
                render={({ field, fieldState }) => (
                  <>
                    <Password
                      inputId="confirm_password"
                      value={field.value}
                      feedback={false}
                      toggleMask
                      disabled={isSaving}
                      autoComplete="new-password"
                      placeholder={i18nT("static.p7hh5s")}
                      className="w-full"
                      inputClassName={`w-full ${
                        fieldState.invalid ? "p-invalid" : ""
                      }`}
                      onChange={(event) => field.onChange(event.target.value)}
                    />

                    {fieldState.error && (
                      <small className="p-error">
                        {fieldState.error.message}
                      </small>
                    )}
                  </>
                )}
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <label
                        htmlFor="user_is_active"
                        className="cursor-pointer text-sm font-medium text-slate-700"
                      >
                        {i18nT("static.fqmzsa")}{" "}
                      </label>

                      <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                        {i18nT("static.n11ooy")}{" "}
                      </p>

                      {isEditingSelf && (
                        <p className="m-0 mt-1 text-xs text-amber-700">
                          {i18nT("static.1w2rugp")}{" "}
                        </p>
                      )}
                    </div>

                    <InputSwitch
                      inputId="user_is_active"
                      checked={Boolean(field.value)}
                      disabled={isSaving || isEditingSelf}
                      onChange={(event) => field.onChange(event.value)}
                    />
                  </div>
                )}
              />
            </div>
          </div>
        </form>
      </Dialog>
    </>
  );
};

export default UserTableData;
