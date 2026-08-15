"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import useSWR from "swr";
import dayjs from "dayjs";

import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputNumber } from "primereact/inputnumber";
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";

import { useDispatch } from "react-redux";

import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";

import { updateApprovalWorkflowSetting } from "@/app/services/approval-service";

import {
  ApprovalWorkflowSetting,
  ApprovalWorkflowSettingForm,
  defaultApprovalWorkflowSettingFormValue,
} from "@/app/types/approval";
import {
  ResponseType,
  ResponseTypeCreateSuccess,
} from "@/app/types/response-type";

import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { fetcher } from "@/app/utils/fetcher";

import { showToast } from "@/store/ToastSlice";

type ApprovalWorkflowSettingListResponse =
  ApprovalWorkflowSetting[] | ResponseType<ApprovalWorkflowSetting[]>;

type ActiveFilter = "ALL" | "ACTIVE" | "INACTIVE";

type TagSeverity = "success" | "secondary" | "info" | "warning" | "danger";

const approvalSettingsUrl = (showDeleted: boolean) =>
  `/api/approval/workflow-settings?show_all=${showDeleted}`;

const MAX_WORKFLOW_NAME_LENGTH = 100;
const MAX_REQUIRED_STEPS = 10;

const getBody = () => document.body;

const normalizeApprovalWorkflowSettings = (
  response?: ApprovalWorkflowSettingListResponse,
): ApprovalWorkflowSetting[] => {
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

const normalizeCode = (value?: string | null) => {
  return String(value ?? "")
    .trim()
    .toUpperCase();
};

const formatLabel = (value?: string | null) => {
  const normalized = normalizeCode(value);

  if (!normalized) {
    return "Unknown";
  }

  return normalized
    .split("_")
    .map((word) => {
      const lower = word.toLowerCase();

      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  const parsed = dayjs(value);

  return parsed.isValid() ? parsed.format("DD MMM YYYY HH:mm") : "-";
};

const getModuleSeverity = (moduleCode?: string | null): TagSeverity => {
  const normalized = normalizeCode(moduleCode);

  if (normalized === "LEAVE") {
    return "success";
  }

  if (normalized === "OVERTIME") {
    return "info";
  }

  return "secondary";
};

const ApprovalSettingsTableData = () => {
  const dispatch = useDispatch();
  // Archived workflow settings are opt-in; this table has no deleted-data
  // toggle, so keep the normal list scoped to active records.
  const apiKey = approvalSettingsUrl(false);

  const [selectedData, setSelectedData] =
    useState<ApprovalWorkflowSetting | null>(null);

  const [dialogVisible, setDialogVisible] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const [globalFilterValue, setGlobalFilterValue] = useState("");

  const [moduleFilter, setModuleFilter] = useState("ALL");

  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("ALL");

  const { control, handleSubmit, reset, setFocus } =
    useForm<ApprovalWorkflowSettingForm>({
      defaultValues: defaultApprovalWorkflowSettingFormValue,
      mode: "onTouched",
    });

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: refreshApprovalSettingsData,
  } = useSWR<ApprovalWorkflowSettingListResponse>(apiKey, fetcher, {
    revalidateOnFocus: false,
  });

  const rows = useMemo(() => {
    return normalizeApprovalWorkflowSettings(data);
  }, [data]);

  const moduleOptions = useMemo(() => {
    const modules = Array.from(
      new Set(
        rows.map((item) => normalizeCode(item.module_code)).filter(Boolean),
      ),
    ).sort((first, second) => first.localeCompare(second));

    return [
      {
        label: "All Modules",
        value: "ALL",
      },
      ...modules.map((moduleCode) => ({
        label: formatLabel(moduleCode),
        value: moduleCode,
      })),
    ];
  }, [rows]);

  const activeOptions: {
    label: string;
    value: ActiveFilter;
  }[] = [
    {
      label: "All Statuses",
      value: "ALL",
    },
    {
      label: "Active",
      value: "ACTIVE",
    },
    {
      label: "Inactive",
      value: "INACTIVE",
    },
  ];

  const filteredRows = useMemo(() => {
    const keyword = globalFilterValue.trim().toLowerCase();

    return rows.filter((row) => {
      const normalizedModule = normalizeCode(row.module_code);

      const searchableValues = [
        row.code,
        row.name,
        row.module_code,
        row.approval_mode,
        String(row.required_steps ?? ""),
      ];

      const matchesKeyword =
        !keyword ||
        searchableValues.some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(keyword),
        );

      const matchesModule =
        moduleFilter === "ALL" || normalizedModule === moduleFilter;

      const matchesActive =
        activeFilter === "ALL" ||
        (activeFilter === "ACTIVE" && row.is_active) ||
        (activeFilter === "INACTIVE" && !row.is_active);

      return matchesKeyword && matchesModule && matchesActive;
    });
  }, [rows, globalFilterValue, moduleFilter, activeFilter]);

  const summary = useMemo(() => {
    return {
      total: rows.length,

      active: rows.filter((item) => item.is_active).length,

      autoApprove: rows.filter((item) => Number(item.required_steps ?? 0) === 0)
        .length,

      approvalRequired: rows.filter(
        (item) => Number(item.required_steps ?? 0) > 0,
      ).length,
    };
  }, [rows]);

  const hasActiveFilter =
    Boolean(globalFilterValue.trim()) ||
    moduleFilter !== "ALL" ||
    activeFilter !== "ALL";

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

  const handleRefresh = async () => {
    try {
      await refreshApprovalSettingsData();
    } catch (err: unknown) {
      showError(err);
    }
  };

  const onGlobalFilterChange = (event: ChangeEvent<HTMLInputElement>) => {
    setGlobalFilterValue(event.target.value);
  };

  const resetFilters = () => {
    setGlobalFilterValue("");
    setModuleFilter("ALL");
    setActiveFilter("ALL");
  };

  const openUpdateDialog = (rowData: ApprovalWorkflowSetting) => {
    setSelectedData(rowData);

    reset({
      id: rowData.id,
      name: rowData.name ?? "",
      required_steps: Number(rowData.required_steps ?? 0),
      is_active: Boolean(rowData.is_active),
      row_version: rowData.row_version,
    });

    setDialogVisible(true);
  };

  const resetDialogState = () => {
    setDialogVisible(false);
    setSelectedData(null);

    reset(defaultApprovalWorkflowSettingFormValue);
  };

  const closeDialog = () => {
    if (isSaving) {
      return;
    }

    resetDialogState();
  };

  const onSubmit = async (formData: ApprovalWorkflowSettingForm) => {
    if (!selectedData || isSaving) {
      return;
    }

    const cleanName = formData.name.trim();

    const requiredSteps = Number(formData.required_steps ?? 0);

    const payload: ApprovalWorkflowSettingForm = {
      ...formData,

      id: selectedData.id,

      name: cleanName,

      required_steps: requiredSteps,

      is_active: Boolean(formData.is_active),

      row_version: selectedData.row_version,
    };

    try {
      setIsSaving(true);

      const response: ResponseType<ResponseTypeCreateSuccess> =
        await updateApprovalWorkflowSetting(
          selectedData.id,
          selectedData.row_version,
          payload,
        );

      await refreshApprovalSettingsData();

      showSuccess(
        response.message || "Approval workflow setting updated successfully.",
      );

      /*
       * Jangan memanggil
       * closeDialog() ketika
       * isSaving masih true karena
       * closeDialog akan menolak
       * proses penutupan.
       */
      resetDialogState();
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const moduleBody = (rowData: ApprovalWorkflowSetting) => {
    return (
      <Tag
        value={formatLabel(rowData.module_code)}
        severity={getModuleSeverity(rowData.module_code)}
        rounded
      />
    );
  };

  const approvalModeBody = (rowData: ApprovalWorkflowSetting) => {
    const normalizedMode = normalizeCode(rowData.approval_mode);

    return (
      <Tag
        value={formatLabel(normalizedMode)}
        severity={normalizedMode === "AUTO" ? "success" : "info"}
        rounded
      />
    );
  };

  const requiredStepBody = (rowData: ApprovalWorkflowSetting) => {
    const requiredSteps = Number(rowData.required_steps ?? 0);

    if (requiredSteps === 0) {
      return (
        <Tag
          value="Auto Approve"
          severity="success"
          icon="pi pi-bolt"
          rounded
        />
      );
    }

    return (
      <Tag
        value={`${requiredSteps} approval step${
          requiredSteps === 1 ? "" : "s"
        }`}
        severity="warning"
        icon="pi pi-sitemap"
        rounded
      />
    );
  };

  const activeBody = (rowData: ApprovalWorkflowSetting) => {
    return rowData.is_active ? (
      <Tag
        value="Active"
        severity="success"
        icon="pi pi-check-circle"
        rounded
      />
    ) : (
      <Tag value="Inactive" severity="secondary" icon="pi pi-ban" rounded />
    );
  };

  const updatedAtBody = (rowData: ApprovalWorkflowSetting) => {
    return (
      <span className="whitespace-nowrap text-sm text-slate-700">
        {formatDateTime(rowData.updated_at)}
      </span>
    );
  };

  const actionBody = (rowData: ApprovalWorkflowSetting) => {
    return (
      <div className="flex justify-end">
        <Button
          type="button"
          icon="pi pi-pencil"
          rounded
          outlined
          severity="help"
          size="small"
          disabled={isSaving}
          tooltip="Update setting"
          tooltipOptions={{
            appendTo: getBody,
            position: "top",
          }}
          onClick={() => openUpdateDialog(rowData)}
        />
      </div>
    );
  };

  const dialogFooter = (
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
        form="approval-workflow-setting-form"
        label="Save Changes"
        icon="pi pi-check"
        loading={isSaving}
        disabled={isSaving}
        className="w-full sm:w-auto"
      />
    </div>
  );

  if (isLoading) {
    return <LoadingDataTable />;
  }

  if (error) {
    return <ErrorNotConnectedToApi mutateKey={apiKey} />;
  }

  return (
    <>
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
          {/* Header */}
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:flex">
                <i className="pi pi-sliders-h text-xl" />
              </div>

              <div className="min-w-0">
                <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
                  Approval Settings
                </h1>

                <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                  Configure approval workflow names, required approval steps,
                  and workflow availability.
                </p>
              </div>
            </div>

            <Button
              type="button"
              label="Refresh"
              icon="pi pi-refresh"
              severity="secondary"
              outlined
              size="small"
              loading={isValidating}
              disabled={isValidating || isSaving}
              className="w-full sm:w-auto"
              onClick={handleRefresh}
            />
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="m-0 text-xs text-slate-500">Total Workflows</p>

              <p className="m-0 mt-1 text-2xl font-semibold text-slate-800">
                {summary.total}
              </p>
            </div>

            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="m-0 text-xs text-green-700">Active</p>

              <p className="m-0 mt-1 text-2xl font-semibold text-green-800">
                {summary.active}
              </p>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="m-0 text-xs text-blue-700">Auto Approve</p>

              <p className="m-0 mt-1 text-2xl font-semibold text-blue-800">
                {summary.autoApprove}
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="m-0 text-xs text-amber-700">Approval Required</p>

              <p className="m-0 mt-1 text-2xl font-semibold text-amber-800">
                {summary.approvalRequired}
              </p>
            </div>
          </div>

          {/* Information */}
          <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
            <i className="pi pi-info-circle mt-1 shrink-0" />

            <div>
              <p className="m-0">
                <strong>Required Steps = 0</strong> means the request is
                configured for automatic approval.
              </p>

              <p className="m-0 mt-1">
                <strong>Required Steps &gt; 0</strong> means the request must
                pass through the configured number of approval steps.
              </p>
            </div>
          </div>

          {/* Filters */}
          <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(18rem,2fr)_minmax(13rem,1fr)_minmax(13rem,1fr)_auto]">
              <IconField iconPosition="left" className="w-full">
                <InputIcon className="pi pi-search" />

                <InputText
                  value={globalFilterValue}
                  onChange={onGlobalFilterChange}
                  placeholder="Search code, name, module, or mode"
                  className="w-full"
                />
              </IconField>

              <Dropdown
                appendTo={getBody}
                value={moduleFilter}
                options={moduleOptions}
                optionLabel="label"
                optionValue="value"
                placeholder="All Modules"
                className="w-full"
                onChange={(event) =>
                  setModuleFilter(String(event.value ?? "ALL"))
                }
              />

              <Dropdown
                appendTo={getBody}
                value={activeFilter}
                options={activeOptions}
                optionLabel="label"
                optionValue="value"
                placeholder="All Statuses"
                className="w-full"
                onChange={(event) =>
                  setActiveFilter((event.value ?? "ALL") as ActiveFilter)
                }
              />

              <Button
                type="button"
                label="Reset"
                icon="pi pi-filter-slash"
                severity="secondary"
                outlined
                disabled={!hasActiveFilter}
                className="w-full xl:w-auto"
                onClick={resetFilters}
              />
            </div>

            <span className="text-xs text-slate-500">
              {filteredRows.length} matching workflow
              {filteredRows.length === 1 ? "" : "s"}
            </span>
          </section>

          {/* Table */}
          <div className="w-full overflow-hidden">
            <DataTable
              value={filteredRows}
              dataKey="id"
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
              tableStyle={{
                minWidth: "90rem",
              }}
              emptyMessage="No approval workflow setting found."
              currentPageReportTemplate="{first} to {last} of {totalRecords}"
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
                field="code"
                header="Code"
                sortable
                body={(rowData: ApprovalWorkflowSetting) => (
                  <span className="font-mono text-sm font-medium text-slate-700">
                    {rowData.code || "-"}
                  </span>
                )}
                style={{
                  minWidth: "18rem",
                }}
              />

              <Column
                field="name"
                header="Workflow Name"
                sortable
                body={(rowData: ApprovalWorkflowSetting) => (
                  <span className="text-sm font-medium text-slate-800">
                    {rowData.name || "-"}
                  </span>
                )}
                style={{
                  minWidth: "22rem",
                }}
              />

              <Column
                field="module_code"
                header="Module"
                sortable
                body={moduleBody}
                style={{
                  minWidth: "12rem",
                }}
              />

              <Column
                field="approval_mode"
                header="Mode"
                sortable
                body={approvalModeBody}
                style={{
                  minWidth: "13rem",
                }}
              />

              <Column
                field="required_steps"
                header="Required Steps"
                sortable
                body={requiredStepBody}
                style={{
                  minWidth: "17rem",
                }}
              />

              <Column
                field="is_active"
                header="Status"
                sortable
                body={activeBody}
                style={{
                  minWidth: "11rem",
                }}
              />

              <Column
                field="updated_at"
                header="Updated At"
                sortable
                body={updatedAtBody}
                style={{
                  minWidth: "17rem",
                }}
              />

              <Column
                header="Action"
                body={actionBody}
                frozen
                alignFrozen="right"
                headerClassName="bg-white"
                className="bg-white"
                headerStyle={{
                  width: "8rem",
                  minWidth: "8rem",
                  textAlign: "right",
                }}
                bodyStyle={{
                  width: "8rem",
                  minWidth: "8rem",
                }}
              />
            </DataTable>
          </div>
        </div>
      </Card>

      {/* Update Dialog */}
      <Dialog
        header="Update Approval Setting"
        visible={dialogVisible}
        style={{
          width: "95vw",
          maxWidth: "45rem",
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
            setFocus("name");
          }, 0);
        }}
      >
        <form
          id="approval-workflow-setting-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5 pt-2"
        >
          {selectedData && (
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap gap-2">
                <Tag
                  value={formatLabel(selectedData.module_code)}
                  severity={getModuleSeverity(selectedData.module_code)}
                  rounded
                />

                <Tag
                  value={formatLabel(selectedData.approval_mode)}
                  severity="info"
                  rounded
                />

                <Tag
                  value={selectedData.code || "-"}
                  severity="secondary"
                  rounded
                />
              </div>

              <p className="m-0 mt-3 text-xs leading-5 text-slate-500">
                Module, code, and approval mode are workflow identity fields and
                cannot be changed from this form.
              </p>
            </section>
          )}

          <section className="flex flex-col gap-4">
            <div>
              <h2 className="m-0 text-sm font-semibold text-slate-800">
                Workflow Configuration
              </h2>

              <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                Update the display name, required approval steps, and active
                status.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="workflow_name"
                className="text-sm font-medium text-slate-700"
              >
                Workflow Name
                <span className="ml-1 text-red-500">*</span>
              </label>

              <Controller
                name="name"
                control={control}
                rules={{
                  required: "Workflow name is required.",

                  maxLength: {
                    value: MAX_WORKFLOW_NAME_LENGTH,
                    message: `Workflow name cannot exceed ${MAX_WORKFLOW_NAME_LENGTH} characters.`,
                  },

                  validate: (value) =>
                    value.trim().length > 0 || "Workflow name is required.",
                }}
                render={({ field, fieldState }) => (
                  <>
                    <InputText
                      {...field}
                      id="workflow_name"
                      value={field.value ?? ""}
                      maxLength={MAX_WORKFLOW_NAME_LENGTH}
                      disabled={isSaving}
                      placeholder="Enter workflow name"
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
                htmlFor="required_steps"
                className="text-sm font-medium text-slate-700"
              >
                Required Approval Steps
                <span className="ml-1 text-red-500">*</span>
              </label>

              <Controller
                name="required_steps"
                control={control}
                rules={{
                  required: "Required steps is required.",

                  validate: (value) => {
                    const parsed = Number(value);

                    if (!Number.isInteger(parsed)) {
                      return "Required steps must be a whole number.";
                    }

                    if (parsed < 0) {
                      return "Required steps cannot be negative.";
                    }

                    if (parsed > MAX_REQUIRED_STEPS) {
                      return `Required steps cannot exceed ${MAX_REQUIRED_STEPS}.`;
                    }

                    return true;
                  },
                }}
                render={({ field, fieldState }) => (
                  <>
                    <InputNumber
                      inputId="required_steps"
                      value={Number(field.value ?? 0)}
                      min={0}
                      max={MAX_REQUIRED_STEPS}
                      minFractionDigits={0}
                      maxFractionDigits={0}
                      showButtons
                      buttonLayout="horizontal"
                      decrementButtonIcon="pi pi-minus"
                      incrementButtonIcon="pi pi-plus"
                      disabled={isSaving}
                      className={`w-full ${
                        fieldState.invalid ? "p-invalid" : ""
                      }`}
                      inputClassName="w-full text-center"
                      onValueChange={(event) =>
                        field.onChange(Number(event.value ?? 0))
                      }
                    />

                    <small className="text-slate-500">
                      0 means automatic approval. Values from 1 to{" "}
                      {MAX_REQUIRED_STEPS} require that number of approval
                      steps.
                    </small>

                    {fieldState.error && (
                      <small className="p-error">
                        {fieldState.error.message}
                      </small>
                    )}
                  </>
                )}
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <label
                        htmlFor="workflow_is_active"
                        className="cursor-pointer text-sm font-medium text-slate-700"
                      >
                        Active Workflow
                      </label>

                      <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                        Controls whether this workflow configuration is enabled.
                      </p>
                    </div>

                    <InputSwitch
                      inputId="workflow_is_active"
                      checked={Boolean(field.value)}
                      disabled={isSaving}
                      onChange={(event) => field.onChange(Boolean(event.value))}
                    />
                  </div>
                )}
              />
            </div>
          </section>
        </form>
      </Dialog>
    </>
  );
};

export default ApprovalSettingsTableData;
