"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import useSWR, { mutate } from "swr";
import dayjs from "dayjs";

import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Checkbox } from "primereact/checkbox";
import { Tag } from "primereact/tag";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";

import { useDispatch } from "react-redux";

import LoadingDataTable from "@/app/_components/LoadingDataTable";
import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import { fetcher } from "@/app/utils/fetcher";
import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { showToast } from "@/store/ToastSlice";

import {
  ApprovalWorkflowSetting,
  ApprovalWorkflowSettingForm,
  defaultApprovalWorkflowSettingFormValue,
} from "@/app/types/approval";

import { updateApprovalWorkflowSetting } from "@/app/services/approval-service";
import {
  ResponseType,
  ResponseTypeCreateSuccess,
} from "@/app/types/response-type";

const API_KEY = "/api/approval/workflow-settings?show_all=true";

const getBody = () => document.body;

type ApprovalWorkflowSettingListResponse =
  ApprovalWorkflowSetting[] | ResponseType<ApprovalWorkflowSetting[]>;

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

const ApprovalSettingsTableData = () => {
  const dispatch = useDispatch();

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [selectedData, setSelectedData] =
    useState<ApprovalWorkflowSetting | null>(null);
  const [visible, setVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setFocus,
    formState: { isValid },
  } = useForm<ApprovalWorkflowSettingForm>({
    defaultValues: defaultApprovalWorkflowSettingFormValue,
    mode: "onTouched",
  });

  const [filters, setFilters] = useState({
    global: { value: "", matchMode: FilterMatchMode.CONTAINS },
  });

  const { data, error, isLoading } =
    useSWR<ApprovalWorkflowSettingListResponse>(API_KEY, fetcher);

  const rows = normalizeApprovalWorkflowSettings(data);

  const refreshData = async () => {
    await mutate(API_KEY);
  };

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    setFilters({
      global: { value, matchMode: FilterMatchMode.CONTAINS },
    });

    setGlobalFilterValue(value);
  };

  const openUpdateDialog = (rowData: ApprovalWorkflowSetting) => {
    setSelectedData(rowData);
    setVisible(true);

    reset({
      id: rowData.id,
      name: rowData.name,
      required_steps: rowData.required_steps,
      is_active: rowData.is_active,
      row_version: rowData.row_version,
    });

    setTimeout(() => {
      setFocus("name");
    }, 0);
  };

  const closeDialog = () => {
    if (isSaving) {
      return;
    }

    setVisible(false);
    setSelectedData(null);
    reset(defaultApprovalWorkflowSettingFormValue);
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
        detail: "Unknown error",
      }),
    );
  };

  const onSubmit = async (formData: ApprovalWorkflowSettingForm) => {
    if (!selectedData || !isValid || isSaving) {
      return;
    }

    try {
      setIsSaving(true);

      const res: ResponseType<ResponseTypeCreateSuccess> =
        await updateApprovalWorkflowSetting(
          selectedData.id,
          selectedData.row_version,
          formData,
        );

      await refreshData();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail:
            res.message || "Approval workflow setting updated successfully.",
        }),
      );

      closeDialog();
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const moduleBody = (rowData: ApprovalWorkflowSetting) => {
    const moduleCode = rowData.module_code?.toUpperCase();

    if (moduleCode === "LEAVE") {
      return <Tag value="Leave" severity="success" />;
    }

    if (moduleCode === "OVERTIME") {
      return <Tag value="Overtime" severity="info" />;
    }

    return <Tag value={rowData.module_code} severity="secondary" />;
  };

  const requiredStepBody = (rowData: ApprovalWorkflowSetting) => {
    if (rowData.required_steps === 0) {
      return <Tag value="Auto Approve" severity="success" />;
    }

    return (
      <Tag
        value={`${rowData.required_steps} approval step(s)`}
        severity="warning"
      />
    );
  };

  const activeBody = (rowData: ApprovalWorkflowSetting) => {
    return rowData.is_active ? (
      <Tag value="Active" severity="success" />
    ) : (
      <Tag value="Inactive" severity="secondary" />
    );
  };

  const updatedAtBody = (rowData: ApprovalWorkflowSetting) => {
    return dayjs(rowData.updated_at).format("DD MMM YYYY HH:mm");
  };

  const actionBody = (rowData: ApprovalWorkflowSetting) => {
    return (
      <Button
        tooltipOptions={{ appendTo: getBody, position: "top" }}
        tooltip="Update setting"
        rounded
        severity="help"
        icon="pi pi-pencil"
        size="small"
        onClick={() => openUpdateDialog(rowData)}
      />
    );
  };

  const footerContent = (
    <div className="flex justify-end gap-3">
      <Button
        type="button"
        label="Cancel"
        icon="pi pi-times"
        onClick={closeDialog}
        className="p-button-text"
        disabled={isSaving}
      />

      <Button
        type="submit"
        label={isSaving ? "Saving..." : "Save"}
        icon={isSaving ? "pi pi-spin pi-spinner" : "pi pi-check"}
        disabled={isSaving}
      />
    </div>
  );

  if (isLoading) {
    return <LoadingDataTable />;
  }

  if (error) {
    return <ErrorNotConnectedToApi mutateKey={API_KEY} />;
  }

  return (
    <>
      <Card>
        <div className="flex flex-col gap-5 p-4 md:p-5">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-2xl font-semibold text-slate-800">
                Approval Settings
              </div>
              <div className="mt-1 text-sm text-slate-500">
                Configure approval workflow per module. Required steps 0 means
                auto approve.
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <IconField iconPosition="left">
                <InputIcon className="pi pi-search" />
                <InputText
                  className="w-full sm:w-[20rem]"
                  value={globalFilterValue}
                  onChange={onGlobalFilterChange}
                  placeholder="Search workflow"
                />
              </IconField>

              <Button
                label="Refresh"
                icon="pi pi-refresh"
                className="p-button-outlined"
                onClick={refreshData}
              />
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-700">
            <b>Required Steps = 0</b> means request will be auto approved.
            <br />
            <b>Required Steps &gt; 0</b> means employee must have
            supervisor/manager chain. If supervisor is missing, request submit
            will fail with clear validation message.
          </div>

          <DataTable
            value={rows}
            tableStyle={{ minWidth: "80rem" }}
            stripedRows
            paginator
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            dataKey="id"
            filters={filters}
            globalFilterFields={[
              "code",
              "name",
              "module_code",
              "approval_mode",
            ]}
            emptyMessage="No approval workflow setting found."
            currentPageReportTemplate="{first} to {last} of {totalRecords}"
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
          >
            <Column
              header="#"
              headerStyle={{ width: "4rem" }}
              body={(_, options) => options.rowIndex + 1}
            />

            <Column field="code" header="Code" style={{ minWidth: "16rem" }} />

            <Column field="name" header="Name" style={{ minWidth: "20rem" }} />

            <Column
              header="Module"
              body={moduleBody}
              style={{ minWidth: "10rem" }}
            />

            <Column
              field="approval_mode"
              header="Mode"
              style={{ minWidth: "14rem" }}
            />

            <Column
              header="Required Steps"
              body={requiredStepBody}
              style={{ minWidth: "14rem" }}
            />

            <Column
              header="Status"
              body={activeBody}
              style={{ minWidth: "10rem" }}
            />

            <Column
              header="Updated At"
              body={updatedAtBody}
              style={{ minWidth: "15rem" }}
            />

            <Column
              header="Action"
              body={actionBody}
              frozen
              alignFrozen="right"
              style={{ minWidth: "8rem" }}
              headerStyle={{
                minWidth: "8rem",
                background: "#ffffff",
                zIndex: 1,
              }}
              bodyStyle={{
                minWidth: "8rem",
                background: "#ffffff",
              }}
            />
          </DataTable>
        </div>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Dialog
          header="Update Approval Setting"
          visible={visible}
          style={{ width: "95vw", maxWidth: "720px" }}
          breakpoints={{ "960px": "95vw" }}
          onHide={closeDialog}
          footer={footerContent}
          modal
          draggable={false}
          resizable={false}
        >
          <div className="flex flex-col gap-5">
            {selectedData && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                <div>
                  <b>Module:</b> {selectedData.module_code}
                </div>
                <div>
                  <b>Code:</b> {selectedData.code}
                </div>
                <div>
                  <b>Mode:</b> {selectedData.approval_mode}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label
                htmlFor="name"
                className="text-sm font-medium text-slate-700"
              >
                Workflow Name
              </label>

              <Controller
                name="name"
                control={control}
                rules={{
                  required: "Workflow name is required",
                  validate: (value) =>
                    value.trim().length > 0 || "Workflow name is required",
                }}
                render={({ field, fieldState }) => (
                  <>
                    <InputText
                      id="name"
                      {...field}
                      className={fieldState.invalid ? "p-invalid" : ""}
                      disabled={isSaving}
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

            <div className="flex flex-col gap-2">
              <label
                htmlFor="required_steps"
                className="text-sm font-medium text-slate-700"
              >
                Required Approval Steps
              </label>

              <Controller
                name="required_steps"
                control={control}
                rules={{
                  validate: (value) =>
                    Number(value) >= 0 || "Required steps cannot be negative",
                }}
                render={({ field, fieldState }) => (
                  <>
                    <InputNumber
                      id="required_steps"
                      value={field.value}
                      min={0}
                      max={10}
                      showButtons
                      onValueChange={(e) => {
                        field.onChange(Number(e.value ?? 0));
                      }}
                      className={fieldState.invalid ? "p-invalid" : ""}
                      disabled={isSaving}
                    />

                    <small className="text-slate-500">
                      0 = auto approve. 1 or more = requires supervisor/manager
                      chain.
                    </small>

                    {fieldState.error && (
                      <small className="font-bold p-error">
                        {fieldState.error.message}
                      </small>
                    )}
                  </>
                )}
              />
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    inputId="is_active"
                    checked={field.value}
                    onChange={(e) => field.onChange(Boolean(e.checked))}
                    disabled={isSaving}
                  />
                )}
              />

              <label
                htmlFor="is_active"
                className="cursor-pointer text-sm text-slate-700"
              >
                Active workflow
              </label>
            </div>
          </div>
        </Dialog>
      </form>
    </>
  );
};

export default ApprovalSettingsTableData;
