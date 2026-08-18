"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import useSWR from "swr";

import dayjs from "dayjs";
import {
  formatDate as formatDisplayDate,
  formatDateTime as formatDisplayDateTime,
} from "@/app/utils/date-format";

import { FilterMatchMode } from "primereact/api";
import { Avatar } from "primereact/avatar";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
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
import { SelectButton } from "primereact/selectbutton";
import { Tag } from "primereact/tag";

import { useDispatch, useSelector } from "react-redux";

import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";

import { quickCreateEmployee } from "@/app/services/employee-quick-create-service";
import {
  deleteEmployee,
  purgeEmployee,
  restoreEmployee,
} from "@/app/services/employee-service";

import { Employee } from "@/app/types/employee";
import {
  QuickCreateEmployeeResult,
  QuickCreateMode,
} from "@/app/types/employee-quick-create";
import { Gender } from "@/app/types/gender";
import { MaritalStatus } from "@/app/types/marital-status";
import { ReligionType } from "@/app/types/religion-type";
import {
  ResponseType,
  ResponseTypeCreateSuccess,
} from "@/app/types/response-type";

import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { useArchivedDataAccess } from "@/app/utils/archived-data-access";
import { fetcher } from "@/app/utils/fetcher";

import { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";
import EmployeeSummaryCards from "./components/EmployeeSummaryCards";
import EmployeePageHeader from "./components/EmployeePageHeader";

type EmployeeListRow = Employee & {
  gender_name?: string | null;
  religion_name?: string | null;
  marital_status_name?: string | null;
};

type QuickCreateEmployeeForm = {
  creation_mode: QuickCreateMode;

  first_name: string;
  middle_name: string;
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

type ProcessingAction = "delete" | "restore" | "purge" | null;
type OnboardingStep = 0 | 1 | 2;

const ONBOARDING_STEPS = [
  {
    label: "Setup",
    description: "Choose account mode",
    icon: "pi pi-sliders-h",
  },
  {
    label: "Personal",
    description: "Employee identity",
    icon: "pi pi-user",
  },
  {
    label: "Review",
    description: "Account and confirmation",
    icon: "pi pi-check-circle",
  },
] as const;

const CREATION_MODE_OPTIONS: {
  label: string;
  value: QuickCreateMode;
}[] = [
  {
    label: "Employee Only",
    value: "employee_only",
  },
  {
    label: "Employee + User",
    value: "employee_with_user",
  },
];

const EMPTY_QUICK_CREATE_FORM: QuickCreateEmployeeForm = {
  creation_mode: "employee_only",

  first_name: "",
  middle_name: "",
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

const getBody = () => document.body;

const buildUsername = (firstName: string, lastName: string) => {
  return `${firstName}.${lastName}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.|\.$/g, "");
};

const getEmployeeFullName = (employee: EmployeeListRow) => {
  return (
    employee.full_name ||
    [employee.first_name, employee.middle_name, employee.last_name]
      .filter(Boolean)
      .join(" ") ||
    "Unknown employee"
  );
};

const formatDate = (value?: string | Date | null) => {
  return formatDisplayDate(value);
};

const formatDateTime = (value?: string | Date | null) => {
  return formatDisplayDateTime(value);
};

const EmployeesDataTable = () => {
  const router = useRouter();
  const dispatch = useDispatch();

  const profileState = useSelector((state: RootState) => state.profile);
  const archivedAccess = useArchivedDataAccess("employee");

  const [globalFilterValue, setGlobalFilterValue] = useState("");

  const [filters, setFilters] = useState({
    global: {
      value: "",
      matchMode: FilterMatchMode.CONTAINS,
    },
  });

  const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] =
    useState(false);

  const [quickCreateDialogVisible, setQuickCreateDialogVisible] =
    useState(false);
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>(0);

  const [credentialDialogVisible, setCredentialDialogVisible] = useState(false);

  const [createdResult, setCreatedResult] =
    useState<QuickCreateEmployeeResult | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  const [processingRowId, setProcessingRowId] = useState<number | null>(null);

  const [processingAction, setProcessingAction] =
    useState<ProcessingAction>(null);

  const listKey = `/api/employees/list?show_all=${
    archivedAccess.canShowDeleted && isShowDeletedDataChecked
  }`;

  const {
    data: employeesData,
    error,
    isLoading,
    isValidating,
    mutate: refreshEmployeesData,
  } = useSWR<EmployeeListRow[]>(listKey, fetcher);

  const {
    data: genderData,
    error: genderError,
    isLoading: genderIsLoading,
    mutate: refreshGenderData,
  } = useSWR<Gender[]>("/api/gender", fetcher);

  const {
    data: religionData,
    error: religionError,
    isLoading: religionIsLoading,
    mutate: refreshReligionData,
  } = useSWR<ReligionType[]>("/api/religion", fetcher);

  const {
    data: maritalStatusData,
    error: maritalStatusError,
    isLoading: maritalStatusIsLoading,
    mutate: refreshMaritalStatusData,
  } = useSWR<MaritalStatus[]>("/api/marital", fetcher);

  const {
    control,
    handleSubmit,
    setFocus,
    reset,
    clearErrors,
    setValue,
    getValues,
    trigger,
  } = useForm<QuickCreateEmployeeForm>({
    defaultValues: EMPTY_QUICK_CREATE_FORM,
    mode: "onTouched",
  });

  const creationMode =
    useWatch({
      control,
      name: "creation_mode",
    }) ?? "employee_only";

  const firstName =
    useWatch({
      control,
      name: "first_name",
    }) ?? "";

  const lastName =
    useWatch({
      control,
      name: "last_name",
    }) ?? "";

  const permissionSet = useMemo(
    () => new Set(profileState.permissions),
    [profileState.permissions],
  );
  const canCreateEmployee = permissionSet.has("employee.create");
  const canDeleteEmployee = permissionSet.has("employee.delete");
  const canRestoreEmployee = archivedAccess.canRestore;
  const canPurgeEmployee = archivedAccess.canPurge;

  const isProcessing = processingRowId !== null;

  const referenceDataLoading =
    genderIsLoading || religionIsLoading || maritalStatusIsLoading;

  const referenceDataError = genderError || religionError || maritalStatusError;

  const activeGenderOptions = useMemo(() => {
    return (genderData ?? []).filter((item) => item.is_active);
  }, [genderData]);

  const activeReligionOptions = useMemo(() => {
    return (religionData ?? []).filter((item) => item.is_active);
  }, [religionData]);

  const activeMaritalStatusOptions = useMemo(() => {
    return (maritalStatusData ?? [])
      .filter((item) => item.is_active)
      .map((item) => ({
        ...item,
        option_value: String(item.id),
      }));
  }, [maritalStatusData]);

  const summary = useMemo(() => {
    const rows = employeesData ?? [];

    return {
      total: rows.length,

      active: rows.filter((item) => !item.deleted_at).length,

      deleted: rows.filter((item) => Boolean(item.deleted_at)).length,

      noOrganization: rows.filter(
        (item) =>
          !item.deleted_at &&
          !item.position_name &&
          !item.department_name &&
          !item.branch_name &&
          !item.agency_name,
      ).length,
    };
  }, [employeesData]);

  useEffect(() => {
    if (creationMode !== "employee_with_user") {
      return;
    }

    const currentUsername = getValues("username").trim();

    if (currentUsername) {
      return;
    }

    const generatedUsername = buildUsername(firstName, lastName);

    if (!generatedUsername) {
      return;
    }

    setValue("username", generatedUsername, {
      shouldValidate: true,
    });
  }, [creationMode, firstName, lastName, getValues, setValue]);

  useEffect(() => {
    if (creationMode === "employee_with_user") {
      void trigger(["username", "email"]);

      return;
    }

    clearErrors(["username", "email"]);
  }, [creationMode, clearErrors, trigger]);

  const showSuccess = (message: string) => {
    dispatch(
      showToast({
        visible: true,
        severity: "success",
        summary: "Success",
        detail: message,
      }),
    );
  };

  const showWarning = (message: string) => {
    dispatch(
      showToast({
        visible: true,
        severity: "warn",
        summary: "Warning",
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
          summary: "Error",
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
          summary: "Error",
          detail: err.message,
        }),
      );

      return;
    }

    dispatch(
      showToast({
        visible: true,
        severity: "error",
        summary: "Error",
        detail: "An unexpected error occurred.",
      }),
    );
  };

  const copyToClipboard = async (
    value: string | null | undefined,
    label: string,
  ) => {
    if (!value) {
      showWarning(`${label} is not available.`);

      return;
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");

        textarea.value = value;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";

        document.body.appendChild(textarea);

        textarea.focus();
        textarea.select();

        const copied = document.execCommand("copy");

        textarea.remove();

        if (!copied) {
          throw new Error("Clipboard copy failed.");
        }
      }

      showSuccess(`${label} copied to clipboard.`);
    } catch (err: unknown) {
      showError(err);
    }
  };

  const handleRefresh = async () => {
    try {
      await Promise.all([
        refreshEmployeesData(),
        refreshGenderData(),
        refreshReligionData(),
        refreshMaritalStatusData(),
      ]);
    } catch (err: unknown) {
      showError(err);
    }
  };

  const onGlobalFilterChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;

    setFilters({
      global: {
        value,
        matchMode: FilterMatchMode.CONTAINS,
      },
    });

    setGlobalFilterValue(value);
  };

  const openQuickCreateDialog = () => {
    clearErrors();
    reset(EMPTY_QUICK_CREATE_FORM);
    setOnboardingStep(0);

    setQuickCreateDialogVisible(true);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("quick_add") !== "1") {
      return;
    }
    const fullName = params.get("candidate_name")?.trim() || "";
    const nameParts = fullName.split(/\s+/).filter(Boolean);
    const firstName = nameParts.shift() || "";
    const lastName = nameParts.join(" ");
    clearErrors();
    reset({
      ...EMPTY_QUICK_CREATE_FORM,
      first_name: firstName,
      last_name: lastName,
      email: params.get("candidate_email")?.trim().toLowerCase() || "",
      username: buildUsername(firstName, lastName),
    });
    setOnboardingStep(0);
    setQuickCreateDialogVisible(true);
  }, [clearErrors, reset]);

  const closeQuickCreateDialog = () => {
    if (isSaving) {
      return;
    }

    setQuickCreateDialogVisible(false);
    setOnboardingStep(0);

    clearErrors();
    reset(EMPTY_QUICK_CREATE_FORM);
  };

  const closeCredentialDialog = () => {
    setCredentialDialogVisible(false);

    setCreatedResult(null);
  };

  const handleQuickCreate = async (form: QuickCreateEmployeeForm) => {
    if (isSaving) {
      return;
    }

    if (referenceDataError) {
      showError(new Error("Employee reference data could not be loaded."));

      return;
    }

    const createUser = form.creation_mode === "employee_with_user";

    if (!form.dob) {
      showError(new Error("Birth date is required."));

      return;
    }

    const recruitmentParams = new URLSearchParams(window.location.search);
    const recruitmentOfferId = Number(
      recruitmentParams.get("recruitment_offer_id"),
    );
    const recruitmentOfferRowVersion = Number(
      recruitmentParams.get("recruitment_offer_row_version"),
    );
    const recruitmentEffectiveDate =
      recruitmentParams.get("effective_date") || "";
    const hasRecruitmentOfferParam = Boolean(
      recruitmentParams.get("recruitment_offer_id"),
    );
    const hasRecruitmentContext =
      Number.isSafeInteger(recruitmentOfferId) &&
      recruitmentOfferId > 0 &&
      Number.isSafeInteger(recruitmentOfferRowVersion) &&
      recruitmentOfferRowVersion > 0 &&
      Boolean(recruitmentEffectiveDate);
    if (hasRecruitmentOfferParam && !hasRecruitmentContext) {
      showError(
        new Error(
          "The recruitment handoff context is incomplete. Return to Recruitment and start onboarding again.",
        ),
      );
      return;
    }

    try {
      setIsSaving(true);

      const response = await quickCreateEmployee({
        create_user: createUser,

        employee: {
          first_name: form.first_name.trim(),

          middle_name: form.middle_name.trim() || null,

          last_name: form.last_name.trim(),

          /*
           * Gunakan format lokal
           * agar tanggal lahir tidak
           * bergeser karena konversi
           * UTC dari toISOString().
           */
          dob: dayjs(form.dob).format("YYYY-MM-DD"),

          gender_id: Number(form.gender_id),

          religion_id: Number(form.religion_id),

          birth_place: form.birth_place.trim(),

          marital_status_id: form.marital_status_id,

          photo_url: null,
        },

        user: createUser
          ? {
              username: form.username.trim().toLowerCase(),

              email: form.email.trim().toLowerCase(),

              password: null,

              role: ["employee"],

              is_active: Boolean(form.user_is_active),
            }
          : null,
        ...(hasRecruitmentContext
          ? {
              recruitment_offer_id: recruitmentOfferId,
              recruitment_offer_row_version: recruitmentOfferRowVersion,
              onboarding_effective_date: recruitmentEffectiveDate,
            }
          : {}),
      });

      const onboardingLinked = Boolean(response.data?.onboarding_linked);
      if (hasRecruitmentContext) {
        router.replace("/employees");
      }

      await refreshEmployeesData();

      setQuickCreateDialogVisible(false);

      clearErrors();
      reset(EMPTY_QUICK_CREATE_FORM);

      showSuccess(
        onboardingLinked
          ? "Employee created, offer linked, and onboarding started."
          : response.message || "Employee created successfully.",
      );

      if (response.data?.user_created) {
        setCreatedResult(response.data);

        setCredentialDialogVisible(true);
      }
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (data: EmployeeListRow) => {
    try {
      setProcessingRowId(data.id);
      setProcessingAction("delete");

      const response: ResponseType<ResponseTypeCreateSuccess> =
        await deleteEmployee(data.id, data.row_version);

      await refreshEmployeesData();

      showSuccess(response.message || "Employee deleted successfully.");
    } catch (err: unknown) {
      showError(err);
    } finally {
      setProcessingRowId(null);
      setProcessingAction(null);
    }
  };

  const handleRestore = async (data: EmployeeListRow) => {
    try {
      setProcessingRowId(data.id);
      setProcessingAction("restore");

      const response: ResponseType<ResponseTypeCreateSuccess> =
        await restoreEmployee(data.id, data.row_version);

      await refreshEmployeesData();

      showSuccess(response.message || "Employee restored successfully.");
    } catch (err: unknown) {
      showError(err);
    } finally {
      setProcessingRowId(null);
      setProcessingAction(null);
    }
  };

  const handlePurge = async (data: EmployeeListRow) => {
    if (!data.deleted_at) {
      showError(
        new Error("Only deleted employee records can be permanently removed."),
      );

      return;
    }

    try {
      setProcessingRowId(data.id);
      setProcessingAction("purge");

      const response: ResponseType<ResponseTypeCreateSuccess> =
        await purgeEmployee(data.id);

      await refreshEmployeesData();

      showSuccess(response.message || "Employee permanently deleted.");
    } catch (err: unknown) {
      showError(err);
    } finally {
      setProcessingRowId(null);
      setProcessingAction(null);
    }
  };

  const onClickDelete = (data: EmployeeListRow) => {
    requestActionConfirmation({
      header: "Delete Employee",
      message: (
        <div className="flex flex-col gap-2">
          <span className="text-slate-600">
            Are you sure you want to delete this employee?
          </span>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="m-0 text-sm font-semibold text-slate-800">
              {getEmployeeFullName(data)}
            </p>

            <p className="m-0 mt-1 font-mono text-xs text-slate-500">
              {data.code || `Employee ID: ${data.id}`}
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
        <div className="flex flex-wrap justify-end gap-2 sm:gap-3">
          <Button
            type="button"
            label="Cancel"
            icon="pi pi-times"
            text
            severity="secondary"
            onClick={options.reject}
          />

          <Button
            type="button"
            label="Delete"
            icon="pi pi-trash"
            severity="danger"
            onClick={options.accept}
          />
        </div>
      ),
    });
  };

  const onClickRestore = (data: EmployeeListRow) => {
    requestActionConfirmation({
      header: "Restore Employee",
      message: (
        <div className="flex flex-col gap-2">
          <span className="text-slate-600">Restore this employee record?</span>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="m-0 text-sm font-semibold text-slate-800">
              {getEmployeeFullName(data)}
            </p>

            <p className="m-0 mt-1 font-mono text-xs text-slate-500">
              {data.code || `Employee ID: ${data.id}`}
            </p>
          </div>
        </div>
      ),
      icon: "pi pi-refresh",
      defaultFocus: "accept",
      accept: () => {
        void handleRestore(data);
      },
      reject: () => undefined,
      footer: (options) => (
        <div className="flex flex-wrap justify-end gap-2 sm:gap-3">
          <Button
            type="button"
            label="Cancel"
            icon="pi pi-times"
            text
            severity="secondary"
            onClick={options.reject}
          />

          <Button
            type="button"
            label="Restore"
            icon="pi pi-refresh"
            severity="success"
            onClick={options.accept}
          />
        </div>
      ),
    });
  };

  const onClickPurge = (data: EmployeeListRow) => {
    requestActionConfirmation({
      header: "Delete Employee Permanently",
      message: (
        <div className="flex flex-col gap-2">
          <span className="text-slate-600">
            This action cannot be undone. Permanently delete:
          </span>

          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="m-0 text-sm font-semibold text-red-800">
              {getEmployeeFullName(data)}
            </p>

            <p className="m-0 mt-1 font-mono text-xs text-red-600">
              {data.code || `Employee ID: ${data.id}`}
            </p>
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
        <div className="flex flex-wrap justify-end gap-2 sm:gap-3">
          <Button
            type="button"
            label="Cancel"
            icon="pi pi-times"
            text
            severity="secondary"
            onClick={options.reject}
          />

          <Button
            type="button"
            label="Delete Permanently"
            icon="pi pi-trash"
            severity="danger"
            onClick={options.accept}
          />
        </div>
      ),
    });
  };

  const openDetail = (data: EmployeeListRow) => {
    if (data.deleted_at) {
      return;
    }

    router.push(`/employees/${data.id}/general/personal`);
  };

  const getInitials = (rowData: EmployeeListRow) => {
    const firstInitial = rowData.first_name?.trim().charAt(0) ?? "";

    const lastInitial = rowData.last_name?.trim().charAt(0) ?? "";

    return `${firstInitial}${lastInitial}`.toUpperCase() || "EM";
  };

  const employeeBodyTemplate = (rowData: EmployeeListRow) => {
    return (
      <div className="flex min-w-0 items-center gap-3">
        <Avatar
          label={getInitials(rowData)}
          shape="circle"
          size="large"
          className="shrink-0 bg-blue-100 text-blue-700"
        />

        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-sm font-semibold text-slate-800">
            {getEmployeeFullName(rowData)}
          </span>

          <span className="truncate font-mono text-xs text-slate-500">
            {rowData.code || "No employee code"}
          </span>
        </div>
      </div>
    );
  };

  const demographicBodyTemplate = (rowData: EmployeeListRow) => {
    const demographicItems = [
      rowData.gender_name,
      rowData.marital_status_name,
    ].filter(Boolean);

    const birthItems = [
      rowData.birth_place,
      rowData.dob ? formatDate(rowData.dob) : null,
    ].filter(Boolean);

    return (
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-sm text-slate-700">
          {demographicItems.join(" • ") || "-"}
        </span>

        <span className="truncate text-xs text-slate-500">
          {birthItems.join(" • ") || "-"}
        </span>

        {rowData.religion_name && (
          <span className="truncate text-xs text-slate-400">
            {rowData.religion_name}
          </span>
        )}
      </div>
    );
  };

  const contactBodyTemplate = (rowData: EmployeeListRow) => {
    const email = rowData.work_email || rowData.personal_email || null;

    return (
      <div className="flex min-w-0 flex-col gap-1">
        {email ? (
          <button
            type="button"
            title={`Copy ${email}`}
            className="flex min-w-0 items-center gap-2 border-0 bg-transparent p-0 text-left text-sm text-blue-700 hover:underline"
            onClick={() => {
              void copyToClipboard(email, "Email");
            }}
          >
            <span className="truncate">{email}</span>

            <i className="pi pi-copy shrink-0 text-xs" />
          </button>
        ) : (
          <span className="text-sm text-slate-400">No email</span>
        )}

        <span className="truncate text-xs text-slate-500">
          {rowData.phone_number || "No phone number"}
        </span>
      </div>
    );
  };

  const organizationBodyTemplate = (rowData: EmployeeListRow) => {
    const primary =
      rowData.position_name ||
      rowData.department_name ||
      "Organization not assigned";

    const secondary = [
      rowData.department_name !== primary ? rowData.department_name : null,
      rowData.branch_name,
      rowData.agency_name,
    ]
      .filter(Boolean)
      .join(" • ");

    return (
      <div className="flex min-w-0 flex-col gap-1">
        <span
          className={`truncate text-sm font-medium ${
            primary === "Organization not assigned"
              ? "text-amber-700"
              : "text-slate-700"
          }`}
        >
          {primary}
        </span>

        <span className="truncate text-xs text-slate-500">
          {secondary || "-"}
        </span>
      </div>
    );
  };

  const statusBodyTemplate = (rowData: EmployeeListRow) => {
    if (rowData.deleted_at) {
      return (
        <div className="flex flex-col items-start gap-1">
          <Tag
            value="Deleted"
            severity="secondary"
            icon="pi pi-trash"
            rounded
          />

          <span className="whitespace-nowrap text-xs text-slate-500">
            {formatDateTime(rowData.deleted_at)}
          </span>
        </div>
      );
    }

    return (
      <Tag
        value="Active"
        severity="success"
        icon="pi pi-check-circle"
        rounded
      />
    );
  };

  const actionColumnBody = (rowData: EmployeeListRow) => {
    const isCurrentRowProcessing = processingRowId === rowData.id;

    if (rowData.deleted_at) {
      if (!canRestoreEmployee && !canPurgeEmployee) {
        return <span className="text-sm text-slate-400">No action</span>;
      }

      return (
        <div className="flex flex-nowrap items-center justify-end gap-2">
          {canRestoreEmployee && (
            <Button
              type="button"
              icon="pi pi-refresh"
              rounded
              outlined
              severity="success"
              size="small"
              tooltip="Restore"
              tooltipOptions={{
                appendTo: getBody,
                position: "top",
              }}
              loading={isCurrentRowProcessing && processingAction === "restore"}
              disabled={isProcessing}
              onClick={() => onClickRestore(rowData)}
            />
          )}

          {canPurgeEmployee && (
            <Button
              type="button"
              icon="pi pi-trash"
              rounded
              outlined
              severity="danger"
              size="small"
              tooltip="Delete permanently"
              tooltipOptions={{
                appendTo: getBody,
                position: "top",
              }}
              loading={isCurrentRowProcessing && processingAction === "purge"}
              disabled={isProcessing}
              onClick={() => onClickPurge(rowData)}
            />
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-nowrap items-center justify-end gap-2">
        {canDeleteEmployee && (
          <Button
            type="button"
            icon="pi pi-eye"
            rounded
            outlined
            severity="secondary"
            size="small"
            tooltip="Open employee detail"
            tooltipOptions={{
              appendTo: getBody,
              position: "top",
            }}
            disabled={isProcessing}
            onClick={() => openDetail(rowData)}
          />
        )}

        <Button
          type="button"
          icon="pi pi-trash"
          rounded
          outlined
          severity="danger"
          size="small"
          tooltip="Delete"
          tooltipOptions={{
            appendTo: getBody,
            position: "top",
          }}
          loading={isCurrentRowProcessing && processingAction === "delete"}
          disabled={isProcessing}
          onClick={() => onClickDelete(rowData)}
        />
      </div>
    );
  };

  const rowClassName = (rowData: EmployeeListRow) => {
    if (rowData.deleted_at) {
      return "bg-slate-50 text-slate-500";
    }

    if (
      !rowData.position_name &&
      !rowData.department_name &&
      !rowData.branch_name &&
      !rowData.agency_name
    ) {
      return "bg-amber-50/30";
    }

    return "";
  };

  const goToPreviousOnboardingStep = () => {
    setOnboardingStep((current) => Math.max(0, current - 1) as OnboardingStep);
  };

  const goToNextOnboardingStep = async () => {
    if (onboardingStep === 0) {
      setOnboardingStep(1);
      setTimeout(() => setFocus("first_name"), 0);
      return;
    }

    const personalDataIsValid = await trigger([
      "first_name",
      "middle_name",
      "last_name",
      "birth_place",
      "dob",
      "gender_id",
      "religion_id",
      "marital_status_id",
    ]);

    if (!personalDataIsValid) {
      return;
    }

    setOnboardingStep(2);
    if (creationMode === "employee_with_user") {
      setTimeout(() => setFocus("username"), 0);
    }
  };

  const quickCreateDialogFooter = (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <Button
          type="button"
          label="Cancel"
          icon="pi pi-times"
          text
          severity="secondary"
          disabled={isSaving}
          className="w-full sm:w-auto"
          onClick={closeQuickCreateDialog}
        />

        {onboardingStep > 0 && (
          <Button
            type="button"
            label="Back"
            icon="pi pi-arrow-left"
            severity="secondary"
            outlined
            disabled={isSaving}
            className="w-full sm:w-auto"
            onClick={goToPreviousOnboardingStep}
          />
        )}
      </div>

      {onboardingStep < 2 ? (
        <Button
          type="button"
          label="Continue"
          icon="pi pi-arrow-right"
          iconPos="right"
          disabled={
            isSaving || referenceDataLoading || Boolean(referenceDataError)
          }
          className="w-full sm:w-auto"
          onClick={() => void goToNextOnboardingStep()}
        />
      ) : (
        <Button
          type="submit"
          form="quick-create-employee-form"
          label={
            creationMode === "employee_with_user"
              ? "Create Employee + User"
              : "Create Employee"
          }
          icon="pi pi-check"
          loading={isSaving}
          disabled={
            isSaving || referenceDataLoading || Boolean(referenceDataError)
          }
          className="w-full sm:w-auto"
        />
      )}
    </div>
  );

  if (isLoading) {
    return <LoadingDataTable />;
  }

  if (error) {
    return <ErrorNotConnectedToApi mutateKey={listKey} />;
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        <EmployeeSummaryCards summary={summary} />

        {/* Employee List */}
        <Card className="border border-slate-200 shadow-sm">
          <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
            <EmployeePageHeader
              title="Employees"
              description="Manage employee records and open detailed employee profiles."
              actions={
                <>
                  <Button
                    type="button"
                    label="Refresh"
                    icon="pi pi-refresh"
                    severity="secondary"
                    outlined
                    size="small"
                    loading={isValidating}
                    disabled={isValidating || isProcessing || isSaving}
                    className="w-full sm:w-auto"
                    onClick={handleRefresh}
                  />

                  {canCreateEmployee && (
                    <Button
                      type="button"
                      label="New Employee"
                      icon="pi pi-plus"
                      size="small"
                      disabled={isProcessing || isSaving}
                      className="w-full sm:w-auto"
                      onClick={openQuickCreateDialog}
                    />
                  )}
                </>
              }
            />

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              {archivedAccess.canShowDeleted ? (
                <div className="flex items-center gap-2">
                  <Checkbox
                    inputId="showDeletedData"
                    checked={isShowDeletedDataChecked}
                    onChange={(event) =>
                      setIsShowDeletedDataChecked(Boolean(event.checked))
                    }
                  />

                  <label
                    htmlFor="showDeletedData"
                    className="cursor-pointer select-none text-sm text-slate-600"
                  >
                    Show deleted records
                  </label>
                </div>
              ) : (
                <span className="text-xs text-slate-500">
                  Showing active employee records.
                </span>
              )}

              <IconField iconPosition="left" className="w-full md:w-96">
                <InputIcon className="pi pi-search" />

                <InputText
                  value={globalFilterValue}
                  onChange={onGlobalFilterChange}
                  placeholder="Search name, code, email, branch, or position"
                  className="w-full"
                />
              </IconField>
            </div>

            <div className="w-full overflow-hidden">
              <DataTable
                value={employeesData ?? []}
                dataKey="id"
                filters={filters}
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
                  "religion_name",
                  "marital_status_name",
                  "birth_place",
                  "agency_name",
                  "branch_name",
                  "department_name",
                  "position_name",
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
                  minWidth: "94rem",
                }}
                emptyMessage="No employee data found."
                currentPageReportTemplate="{first} to {last} of {totalRecords}"
                paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
                onRowDoubleClick={(event) => {
                  openDetail(event.data as EmployeeListRow);
                }}
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
                  header="Employee"
                  sortable
                  sortField="full_name"
                  body={employeeBodyTemplate}
                  style={{
                    minWidth: "21rem",
                  }}
                />

                <Column
                  header="Demographic"
                  body={demographicBodyTemplate}
                  style={{
                    minWidth: "18rem",
                  }}
                />

                <Column
                  header="Contact"
                  body={contactBodyTemplate}
                  style={{
                    minWidth: "20rem",
                  }}
                />

                <Column
                  header="Organization"
                  body={organizationBodyTemplate}
                  style={{
                    minWidth: "20rem",
                  }}
                />

                <Column
                  header="Status"
                  body={statusBodyTemplate}
                  style={{
                    minWidth: "13rem",
                  }}
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
                  bodyStyle={{
                    width: "10rem",
                    minWidth: "10rem",
                  }}
                />
              </DataTable>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Create Employee */}
      <Dialog
        header="Quick Add Employee"
        visible={quickCreateDialogVisible}
        style={{
          width: "95vw",
          maxWidth: "62rem",
        }}
        breakpoints={{
          "960px": "92vw",
          "640px": "96vw",
        }}
        footer={quickCreateDialogFooter}
        modal
        draggable={false}
        resizable={false}
        closable={!isSaving}
        closeOnEscape={!isSaving}
        onHide={closeQuickCreateDialog}
      >
        <form
          id="quick-create-employee-form"
          onSubmit={handleSubmit(handleQuickCreate)}
          className="flex flex-col gap-6 pt-2"
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {ONBOARDING_STEPS.map((step, index) => {
              const isActive = onboardingStep === index;
              const isComplete = onboardingStep > index;

              return (
                <div
                  key={step.label}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors ${
                    isActive
                      ? "border-blue-200 bg-blue-50"
                      : isComplete
                        ? "border-emerald-200 bg-emerald-50/70"
                        : "border-slate-200 bg-white"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : isComplete
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <i
                      className={
                        isComplete ? "pi pi-check" : `${step.icon} text-sm`
                      }
                    />
                  </span>

                  <div className="min-w-0">
                    <p
                      className={`m-0 text-sm font-semibold ${
                        isActive
                          ? "text-blue-900"
                          : isComplete
                            ? "text-emerald-900"
                            : "text-slate-700"
                      }`}
                    >
                      {index + 1}. {step.label}
                    </p>
                    <p className="m-0 mt-0.5 truncate text-xs text-slate-500">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Creation Mode */}
          {onboardingStep === 0 && (
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4">
                <h2 className="m-0 text-sm font-semibold text-slate-800">
                  Creation Mode
                </h2>

                <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                  Create only an employee profile or create the employee
                  together with a login account.
                </p>
              </div>

              <Controller
                name="creation_mode"
                control={control}
                render={({ field }) => (
                  <SelectButton
                    value={field.value}
                    options={CREATION_MODE_OPTIONS}
                    optionLabel="label"
                    optionValue="value"
                    allowEmpty={false}
                    disabled={isSaving}
                    className="w-full"
                    onChange={(event) =>
                      field.onChange(event.value as QuickCreateMode)
                    }
                  />
                )}
              />
            </section>
          )}

          {referenceDataError && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <i className="pi pi-exclamation-circle mt-0.5" />

              <span>
                Gender, religion, or marital-status reference data could not be
                loaded. Refresh the page before creating an employee.
              </span>
            </div>
          )}

          {/* Basic Information */}
          {onboardingStep === 1 && (
            <section className="flex flex-col gap-4">
              <div className="border-b border-slate-200 pb-2">
                <h2 className="m-0 text-sm font-semibold text-slate-800">
                  Basic Information
                </h2>

                <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                  Enter the employee&apos;s identity and demographic
                  information.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="first_name"
                    className="text-sm font-medium text-slate-700"
                  >
                    First Name
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <Controller
                    name="first_name"
                    control={control}
                    rules={{
                      required: "First name is required.",
                      maxLength: {
                        value: 50,
                        message: "First name cannot exceed 50 characters.",
                      },
                    }}
                    render={({ field, fieldState }) => (
                      <>
                        <InputText
                          {...field}
                          id="first_name"
                          value={field.value ?? ""}
                          autoComplete="off"
                          placeholder="Enter first name"
                          disabled={isSaving}
                          className={`w-full ${
                            fieldState.invalid ? "p-invalid" : ""
                          }`}
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
                    htmlFor="middle_name"
                    className="text-sm font-medium text-slate-700"
                  >
                    Middle Name
                  </label>

                  <Controller
                    name="middle_name"
                    control={control}
                    rules={{
                      maxLength: {
                        value: 50,
                        message: "Middle name cannot exceed 50 characters.",
                      },
                    }}
                    render={({ field, fieldState }) => (
                      <>
                        <InputText
                          {...field}
                          id="middle_name"
                          value={field.value ?? ""}
                          autoComplete="off"
                          placeholder="Enter middle name"
                          disabled={isSaving}
                          className={`w-full ${
                            fieldState.invalid ? "p-invalid" : ""
                          }`}
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
                    htmlFor="last_name"
                    className="text-sm font-medium text-slate-700"
                  >
                    Last Name
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <Controller
                    name="last_name"
                    control={control}
                    rules={{
                      required: "Last name is required.",
                      maxLength: {
                        value: 50,
                        message: "Last name cannot exceed 50 characters.",
                      },
                    }}
                    render={({ field, fieldState }) => (
                      <>
                        <InputText
                          {...field}
                          id="last_name"
                          value={field.value ?? ""}
                          autoComplete="off"
                          placeholder="Enter last name"
                          disabled={isSaving}
                          className={`w-full ${
                            fieldState.invalid ? "p-invalid" : ""
                          }`}
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
                    htmlFor="birth_place"
                    className="text-sm font-medium text-slate-700"
                  >
                    Birth Place
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <Controller
                    name="birth_place"
                    control={control}
                    rules={{
                      required: "Birth place is required.",
                      maxLength: {
                        value: 100,
                        message: "Birth place cannot exceed 100 characters.",
                      },
                    }}
                    render={({ field, fieldState }) => (
                      <>
                        <InputText
                          {...field}
                          id="birth_place"
                          value={field.value ?? ""}
                          autoComplete="off"
                          placeholder="Enter birth place"
                          disabled={isSaving}
                          className={`w-full ${
                            fieldState.invalid ? "p-invalid" : ""
                          }`}
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
                    htmlFor="dob"
                    className="text-sm font-medium text-slate-700"
                  >
                    Birth Date
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <Controller
                    name="dob"
                    control={control}
                    rules={{
                      required: "Birth date is required.",
                      validate: (value) => {
                        if (!value) {
                          return true;
                        }

                        return (
                          !dayjs(value).isAfter(dayjs(), "day") ||
                          "Birth date cannot be in the future."
                        );
                      },
                    }}
                    render={({ field, fieldState }) => (
                      <>
                        <Calendar
                          id="dob"
                          appendTo={getBody}
                          value={field.value}
                          dateFormat="dd MM yy"
                          showIcon
                          maxDate={new Date()}
                          placeholder="Select birth date"
                          disabled={isSaving}
                          className={`w-full ${
                            fieldState.invalid ? "p-invalid" : ""
                          }`}
                          onChange={(event) =>
                            field.onChange((event.value as Date | null) ?? null)
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
                    htmlFor="gender_id"
                    className="text-sm font-medium text-slate-700"
                  >
                    Gender
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <Controller
                    name="gender_id"
                    control={control}
                    rules={{
                      required: "Gender is required.",
                      validate: (value) =>
                        Number(value) > 0 || "Gender is required.",
                    }}
                    render={({ field, fieldState }) => (
                      <>
                        <Dropdown
                          id="gender_id"
                          appendTo={getBody}
                          value={field.value}
                          options={activeGenderOptions}
                          optionLabel="name"
                          optionValue="id"
                          filter
                          showClear
                          loading={genderIsLoading}
                          disabled={
                            isSaving || genderIsLoading || Boolean(genderError)
                          }
                          placeholder="Select gender"
                          className={`w-full ${
                            fieldState.invalid ? "p-invalid" : ""
                          }`}
                          onChange={(event) =>
                            field.onChange(event.value ?? null)
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
                    htmlFor="religion_id"
                    className="text-sm font-medium text-slate-700"
                  >
                    Religion
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <Controller
                    name="religion_id"
                    control={control}
                    rules={{
                      required: "Religion is required.",
                      validate: (value) =>
                        Number(value) > 0 || "Religion is required.",
                    }}
                    render={({ field, fieldState }) => (
                      <>
                        <Dropdown
                          id="religion_id"
                          appendTo={getBody}
                          value={field.value}
                          options={activeReligionOptions}
                          optionLabel="name"
                          optionValue="id"
                          filter
                          showClear
                          loading={religionIsLoading}
                          disabled={
                            isSaving ||
                            religionIsLoading ||
                            Boolean(religionError)
                          }
                          placeholder="Select religion"
                          className={`w-full ${
                            fieldState.invalid ? "p-invalid" : ""
                          }`}
                          onChange={(event) =>
                            field.onChange(event.value ?? null)
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
                    htmlFor="marital_status_id"
                    className="text-sm font-medium text-slate-700"
                  >
                    Marital Status
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <Controller
                    name="marital_status_id"
                    control={control}
                    rules={{
                      required: "Marital status is required.",
                    }}
                    render={({ field, fieldState }) => (
                      <>
                        <Dropdown
                          id="marital_status_id"
                          appendTo={getBody}
                          value={field.value}
                          options={activeMaritalStatusOptions}
                          optionLabel="name"
                          optionValue="option_value"
                          filter
                          showClear
                          loading={maritalStatusIsLoading}
                          disabled={
                            isSaving ||
                            maritalStatusIsLoading ||
                            Boolean(maritalStatusError)
                          }
                          placeholder="Select marital status"
                          className={`w-full ${
                            fieldState.invalid ? "p-invalid" : ""
                          }`}
                          onChange={(event) =>
                            field.onChange(event.value ?? "")
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
              </div>
            </section>
          )}

          {/* Login Account */}
          {onboardingStep === 2 && creationMode === "employee_with_user" && (
            <section className="flex flex-col gap-4 rounded-xl border border-blue-200 bg-blue-50/40 p-4">
              <div>
                <h2 className="m-0 text-sm font-semibold text-slate-800">
                  Login Account
                </h2>

                <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                  The account receives the employee role. Password is generated
                  automatically and must be changed at first login.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="username"
                    className="text-sm font-medium text-slate-700"
                  >
                    Username
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <Controller
                    name="username"
                    control={control}
                    rules={{
                      validate: (value) => {
                        if (creationMode !== "employee_with_user") {
                          return true;
                        }

                        const username = value.trim().toLowerCase();

                        if (!username) {
                          return "Username is required.";
                        }

                        if (username.length < 3) {
                          return "Username must contain at least 3 characters.";
                        }

                        if (username.length > 50) {
                          return "Username cannot exceed 50 characters.";
                        }

                        return (
                          /^[a-z0-9._-]+$/.test(username) ||
                          "Username may only contain lowercase letters, numbers, dot, underscore, and hyphen."
                        );
                      },
                    }}
                    render={({ field, fieldState }) => (
                      <>
                        <div className="flex gap-2">
                          <InputText
                            {...field}
                            id="username"
                            value={field.value ?? ""}
                            autoComplete="off"
                            placeholder="Enter username"
                            disabled={isSaving}
                            className={`w-full ${
                              fieldState.invalid ? "p-invalid" : ""
                            }`}
                            onChange={(event) =>
                              field.onChange(event.target.value.toLowerCase())
                            }
                          />

                          <Button
                            type="button"
                            icon="pi pi-refresh"
                            severity="secondary"
                            outlined
                            disabled={isSaving}
                            tooltip="Generate username"
                            tooltipOptions={{
                              appendTo: getBody,
                              position: "top",
                            }}
                            onClick={() => {
                              const generated = buildUsername(
                                getValues("first_name"),
                                getValues("last_name"),
                              );

                              setValue("username", generated, {
                                shouldValidate: true,
                                shouldDirty: true,
                              });
                            }}
                          />
                        </div>

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
                    Login Email
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <Controller
                    name="email"
                    control={control}
                    rules={{
                      validate: (value) => {
                        if (creationMode !== "employee_with_user") {
                          return true;
                        }

                        const email = value.trim().toLowerCase();

                        if (!email) {
                          return "Email is required.";
                        }

                        if (email.length > 254) {
                          return "Email cannot exceed 254 characters.";
                        }

                        return (
                          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
                          "Email format is not valid."
                        );
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
                          placeholder="employee@company.com"
                          disabled={isSaving}
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

                <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-4">
                  <Controller
                    name="user_is_active"
                    control={control}
                    render={({ field }) => (
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <label
                            htmlFor="user_is_active"
                            className="cursor-pointer text-sm font-medium text-slate-700"
                          >
                            Active Login
                          </label>

                          <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                            Turn this off when the user account should be
                            created but cannot log in yet.
                          </p>
                        </div>

                        <InputSwitch
                          inputId="user_is_active"
                          checked={Boolean(field.value)}
                          disabled={isSaving}
                          onChange={(event) => field.onChange(event.value)}
                        />
                      </div>
                    )}
                  />
                </div>
              </div>
            </section>
          )}

          {onboardingStep === 2 && (
            <section className="flex flex-col gap-4">
              <div className="border-b border-slate-200 pb-2">
                <h2 className="m-0 text-sm font-semibold text-slate-800">
                  Review Employee
                </h2>
                <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                  Confirm the onboarding information before creating the
                  employee.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="m-0 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Employee
                  </p>
                  <p className="m-0 mt-2 font-semibold text-slate-900">
                    {[
                      getValues("first_name"),
                      getValues("middle_name"),
                      getValues("last_name"),
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                  <p className="m-0 mt-1 text-sm text-slate-500">
                    Born in {getValues("birth_place")} ·{" "}
                    {formatDate(getValues("dob"))}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="m-0 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Login Access
                  </p>
                  <p className="m-0 mt-2 font-semibold text-slate-900">
                    {creationMode === "employee_with_user"
                      ? "Employee account"
                      : "Profile only"}
                  </p>
                  <p className="m-0 mt-1 truncate text-sm text-slate-500">
                    {creationMode === "employee_with_user"
                      ? getValues("email") || "Email not entered"
                      : "A login account can be added later."}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <i className="pi pi-info-circle mt-0.5 text-amber-700" />
                <p className="m-0 text-sm leading-6 text-amber-900">
                  Organization, employment, payroll, and attendance details can
                  be completed from the employee profile after this onboarding
                  step.
                </p>
              </div>
            </section>
          )}
        </form>
      </Dialog>

      {/* Credentials */}
      <Dialog
        header="Login Account Created"
        visible={credentialDialogVisible}
        style={{
          width: "95vw",
          maxWidth: "38rem",
        }}
        breakpoints={{
          "640px": "95vw",
        }}
        modal
        draggable={false}
        resizable={false}
        onHide={closeCredentialDialog}
        footer={
          <div className="flex justify-end">
            <Button
              type="button"
              label="Close"
              icon="pi pi-check"
              onClick={closeCredentialDialog}
            />
          </div>
        }
      >
        <div className="flex flex-col gap-5 pt-2">
          <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            <i className="pi pi-check-circle mt-0.5" />

            <span>Employee and login account were created successfully.</span>
          </div>

          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-[8rem_minmax(0,1fr)] items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm">
              <span className="font-medium text-slate-500">Employee ID</span>

              <span className="font-mono text-slate-800">
                {createdResult?.employee_id ?? "-"}
              </span>
            </div>

            <div className="grid grid-cols-[8rem_minmax(0,1fr)] items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm">
              <span className="font-medium text-slate-500">User ID</span>

              <span className="font-mono text-slate-800">
                {createdResult?.user_id ?? "-"}
              </span>
            </div>

            <div className="grid grid-cols-[8rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm">
              <span className="font-medium text-slate-500">Username</span>

              <span className="min-w-0 truncate font-mono text-slate-800">
                {createdResult?.username ?? "-"}
              </span>

              <Button
                type="button"
                icon="pi pi-copy"
                rounded
                text
                size="small"
                severity="secondary"
                tooltip="Copy username"
                tooltipOptions={{
                  appendTo: getBody,
                  position: "top",
                }}
                onClick={() => {
                  void copyToClipboard(createdResult?.username, "Username");
                }}
              />
            </div>

            <div className="grid grid-cols-[8rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
              <span className="font-medium text-amber-700">Password</span>

              <span className="min-w-0 break-all font-mono font-semibold text-amber-900">
                {createdResult?.temporary_password ?? "-"}
              </span>

              <Button
                type="button"
                icon="pi pi-copy"
                rounded
                text
                size="small"
                severity="warning"
                tooltip="Copy temporary password"
                tooltipOptions={{
                  appendTo: getBody,
                  position: "top",
                }}
                onClick={() => {
                  void copyToClipboard(
                    createdResult?.temporary_password,
                    "Temporary password",
                  );
                }}
              />
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
            <i className="pi pi-exclamation-triangle mt-0.5" />

            <span>
              Save the temporary password now. It may not be displayed again,
              and the user must change it during the first login.
            </span>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default EmployeesDataTable;
