"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import useSWR from "swr";

import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Checkbox } from "primereact/checkbox";
import { Column } from "primereact/column";
import { confirmDialog, ConfirmDialog } from "primereact/confirmdialog";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputNumber } from "primereact/inputnumber";
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { RadioButton } from "primereact/radiobutton";
import { Tag } from "primereact/tag";

import { useDispatch, useSelector } from "react-redux";

import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";

import {
  createShiftRule,
  deleteShiftRule,
  purgeShiftRule,
  restoreShiftRule,
  updateShiftRule,
} from "@/app/services/shift-rule-service";

import {
  ResponseType,
  ResponseTypeCreateSuccess,
} from "@/app/types/response-type";
import { Shift } from "@/app/types/shift";
import { ShiftRule } from "@/app/types/shift-rule";

import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { fetcher } from "@/app/utils/fetcher";
import { hasRole } from "@/app/utils/role-utils";

import { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";

const ROTATION_MODE_OPTIONS = [
  {
    label: "Rolling",
    value: "ROLLING",
  },
  {
    label: "Change on Specific Day",
    value: "CHANGE_ON_DAY",
  },
];

const CHANGE_DAY_OPTIONS = [
  {
    label: "Monday",
    value: "MONDAY",
  },
  {
    label: "Tuesday",
    value: "TUESDAY",
  },
  {
    label: "Wednesday",
    value: "WEDNESDAY",
  },
  {
    label: "Thursday",
    value: "THURSDAY",
  },
  {
    label: "Friday",
    value: "FRIDAY",
  },
  {
    label: "Saturday",
    value: "SATURDAY",
  },
  {
    label: "Sunday",
    value: "SUNDAY",
  },
];

const EMPTY_SHIFT_RULE = {
  id: 0,
  name: "",
  schedule_type: "",
  base_shift_id: 0,
  is_active: true,
  rotation_mode: "ROLLING",
  change_day: null,
  rules: [],
  deleted_at: "",
  row_version: 0,
} as ShiftRule;

const getBody = () => document.body;

const ShiftRuleTableData = () => {
  const dispatch = useDispatch();

  const profileState = useSelector((state: RootState) => state.profile);

  const [selectedData, setSelectedData] = useState<ShiftRule | null>(null);

  const [globalFilterValue, setGlobalFilterValue] = useState("");

  const [filters, setFilters] = useState({
    global: {
      value: "",
      matchMode: FilterMatchMode.CONTAINS,
    },
  });

  const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] =
    useState(false);

  const [isAddNew, setIsAddNew] = useState(false);

  const [visible, setVisible] = useState(false);

  const [popupHeaderTitle, setPopupHeaderTitle] = useState("New Shift Rule");

  const [isSaving, setIsSaving] = useState(false);

  const currentKey = `/api/shift-rule?show_all=${isShowDeletedDataChecked}`;

  const shiftKey = "/api/shift?show_all=false";

  const {
    data: shiftRuleData,
    error,
    isLoading,
    isValidating,
    mutate: refreshShiftRuleData,
  } = useSWR<ShiftRule[]>(currentKey, fetcher);

  const {
    data: shiftData,
    error: shiftError,
    isLoading: shiftIsLoading,
    isValidating: shiftIsValidating,
    mutate: refreshShiftData,
  } = useSWR<Shift[]>(shiftKey, fetcher);

  const {
    control,
    handleSubmit,
    setFocus,
    setValue,
    getValues,
    reset,
    clearErrors,
  } = useForm<ShiftRule>({
    defaultValues: EMPTY_SHIFT_RULE,
    mode: "onTouched",
  });

  const { fields, append, replace } = useFieldArray({
    control,
    name: "rules",
    keyName: "fieldKey",
  });

  const watchedScheduleType =
    useWatch({
      control,
      name: "schedule_type",
    }) ?? "";

  const watchedRotationMode =
    useWatch({
      control,
      name: "rotation_mode",
    }) ?? "ROLLING";

  const referencedShiftIds = useMemo(() => {
    const values = new Set<number>();

    const baseShiftId = Number(selectedData?.base_shift_id ?? 0);

    if (baseShiftId > 0) {
      values.add(baseShiftId);
    }

    for (const rule of selectedData?.rules ?? []) {
      const shiftId = Number(rule.shift_id ?? 0);

      if (shiftId > 0) {
        values.add(shiftId);
      }
    }

    return values;
  }, [selectedData]);

  const shiftOptions = useMemo(() => {
    return (shiftData ?? []).filter((shift) => {
      if (shift.deleted_at) {
        return false;
      }

      return shift.is_active || referencedShiftIds.has(Number(shift.id));
    });
  }, [shiftData, referencedShiftIds]);

  /*
   * RotationRule.shift_id bertipe string.
   * Karena ID Shift dari API bertipe number,
   * dropdown rotation menggunakan option_value
   * agar nilainya konsisten sebagai string.
   */
  const shiftDropdownOptions = useMemo(() => {
    return shiftOptions.map((shift) => ({
      ...shift,
      option_value: String(shift.id),
    }));
  }, [shiftOptions]);

  const shiftNameMap = useMemo(() => {
    return new Map(
      (shiftData ?? []).map((shift) => [String(shift.id), shift.name]),
    );
  }, [shiftData]);

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

  const showError = (errorData: unknown) => {
    if (isResponseTypeError(errorData)) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Error",
          detail: getErrorMessage(errorData, "message"),
        }),
      );

      return;
    }

    if (errorData instanceof Error) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Error",
          detail: errorData.message,
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

  const showValidationError = (message: string) => {
    dispatch(
      showToast({
        visible: true,
        severity: "error",
        summary: "Validation Error",
        detail: message,
      }),
    );
  };

  const createDefaultRule = (
    sequenceNumber: number,
  ): NonNullable<ShiftRule["rules"]>[number] => {
    return {
      sequence_no: sequenceNumber,
      shift_id: "",
      duration_days: 1,
    };
  };

  const normalizeRulesAfterRemoval = (removeIndex: number) => {
    const currentRules = getValues("rules") ?? [];

    const nextRules = currentRules
      .filter((_, index) => index !== removeIndex)
      .map((rule, index) => ({
        ...rule,
        sequence_no: index + 1,
      }));

    replace(nextRules);
  };

  const normalizeShiftRuleForm = (data: ShiftRule): ShiftRule => {
    const payload: ShiftRule = {
      ...data,
      name: data.name.trim(),
      rules: [...(data.rules ?? [])],
    };

    if (payload.schedule_type === "FIXED") {
      return {
        ...payload,
        base_shift_id: Number(payload.base_shift_id ?? 0),
        rotation_mode: null,
        change_day: null,
        rules: [],
      };
    }

    const orderedRules: NonNullable<ShiftRule["rules"]> = [
      ...(payload.rules ?? []),
    ]
      .sort(
        (first, second) =>
          Number(first.sequence_no ?? 0) - Number(second.sequence_no ?? 0),
      )
      .map((rule, index) => ({
        ...rule,
        sequence_no: index + 1,
        shift_id: String(rule.shift_id ?? ""),
        duration_days:
          payload.rotation_mode === "CHANGE_ON_DAY"
            ? 1
            : Number(rule.duration_days ?? 1),
      }));

    return {
      ...payload,
      base_shift_id: 0,
      change_day:
        payload.rotation_mode === "CHANGE_ON_DAY" ? payload.change_day : null,
      rules: orderedRules,
    };
  };

  const handleCloseDialog = () => {
    setVisible(false);
    setSelectedData(null);
    setIsAddNew(false);
    setPopupHeaderTitle("New Shift Rule");
    clearErrors();
    reset(EMPTY_SHIFT_RULE);
  };

  const handleRefresh = async () => {
    try {
      await Promise.all([refreshShiftRuleData(), refreshShiftData()]);
    } catch (errorData: unknown) {
      showError(errorData);
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

  const onShowDeletedChange = (checked: boolean) => {
    setIsShowDeletedDataChecked(checked);
  };

  const onClickNew = () => {
    clearErrors();
    setSelectedData(null);
    setIsAddNew(true);
    setPopupHeaderTitle("New Shift Rule");
    reset(EMPTY_SHIFT_RULE);
    replace([]);
    setVisible(true);
  };

  const onClickUpdate = (rowData: ShiftRule) => {
    clearErrors();
    setSelectedData(rowData);
    setIsAddNew(false);
    setPopupHeaderTitle("Edit Shift Rule");

    const orderedRules: NonNullable<ShiftRule["rules"]> = [
      ...(rowData.rules ?? []),
    ]
      .sort(
        (first, second) =>
          Number(first.sequence_no ?? 0) - Number(second.sequence_no ?? 0),
      )
      .map((rule) => ({
        ...rule,
        shift_id: String(rule.shift_id ?? ""),
        duration_days: Number(rule.duration_days ?? 1),
      }));

    reset({
      ...rowData,
      base_shift_id: rowData.base_shift_id ?? 0,
      rotation_mode: rowData.rotation_mode ?? "ROLLING",
      change_day: rowData.change_day ?? null,
      rules: orderedRules,
      deleted_at: rowData.deleted_at ?? "",
    });

    replace(orderedRules);
    setVisible(true);
  };

  const handleSubmitNew = async (formData: ShiftRule) => {
    try {
      setIsSaving(true);

      const response: ResponseType<ResponseTypeCreateSuccess> =
        await createShiftRule(normalizeShiftRuleForm(formData));

      await refreshShiftRuleData();

      handleCloseDialog();
      showSuccess(response.message);
    } catch (errorData: unknown) {
      showError(errorData);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (formData: ShiftRule) => {
    if (!selectedData) {
      showError(new Error("Shift rule data is not selected."));

      return;
    }

    try {
      setIsSaving(true);

      const response: ResponseType<ResponseTypeCreateSuccess> =
        await updateShiftRule(
          selectedData.id,
          selectedData.row_version,
          normalizeShiftRuleForm(formData),
        );

      await refreshShiftRuleData();

      handleCloseDialog();
      showSuccess(response.message);
    } catch (errorData: unknown) {
      showError(errorData);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (rowData: ShiftRule) => {
    try {
      const response: ResponseType<ResponseTypeCreateSuccess> =
        await deleteShiftRule(rowData.id, rowData.row_version);

      await refreshShiftRuleData();
      showSuccess(response.message);
    } catch (errorData: unknown) {
      showError(errorData);
    }
  };

  const handleRestore = async (rowData: ShiftRule) => {
    try {
      const response: ResponseType<ResponseTypeCreateSuccess> =
        await restoreShiftRule(rowData.id, rowData.row_version);

      await refreshShiftRuleData();
      showSuccess(response.message);
    } catch (errorData: unknown) {
      showError(errorData);
    }
  };

  const handlePurge = async (rowData: ShiftRule) => {
    try {
      const response: ResponseType<ResponseTypeCreateSuccess> =
        await purgeShiftRule(rowData.id);

      await refreshShiftRuleData();
      showSuccess(response.message);
    } catch (errorData: unknown) {
      showError(errorData);
    }
  };

  const validateRotationRules = (formData: ShiftRule) => {
    const rules = formData.rules ?? [];

    if (rules.length === 0) {
      showValidationError("At least one rotation pattern is required.");

      return false;
    }

    const invalidShift = rules.some(
      (rule) => !String(rule.shift_id ?? "").trim(),
    );

    if (invalidShift) {
      showValidationError("Every rotation pattern must have a shift.");

      return false;
    }

    const sequences = rules.map((rule) => Number(rule.sequence_no ?? 0));

    const hasInvalidSequence = sequences.some((sequence) => sequence <= 0);

    if (hasInvalidSequence) {
      showValidationError("Every sequence must be greater than 0.");

      return false;
    }

    const uniqueSequences = new Set(sequences);

    if (uniqueSequences.size !== sequences.length) {
      showValidationError("Rotation pattern sequences must be unique.");

      return false;
    }

    if (formData.rotation_mode === "ROLLING") {
      const invalidDuration = rules.some(
        (rule) => Number(rule.duration_days ?? 0) <= 0,
      );

      if (invalidDuration) {
        showValidationError(
          "Every rolling rotation duration must be greater than 0.",
        );

        return false;
      }
    }

    return true;
  };

  const onSubmit = async (formData: ShiftRule) => {
    if (isSaving) {
      return;
    }

    if (!formData.schedule_type) {
      showValidationError("Schedule type is required.");

      return;
    }

    if (formData.schedule_type === "FIXED") {
      if (Number(formData.base_shift_id ?? 0) <= 0) {
        showValidationError(
          "Base shift must be selected for a fixed schedule.",
        );

        return;
      }
    }

    if (formData.schedule_type === "ROTATION") {
      if (!formData.rotation_mode) {
        showValidationError("Rotation mode is required.");

        return;
      }

      if (formData.rotation_mode === "CHANGE_ON_DAY" && !formData.change_day) {
        showValidationError("Select the day when the shift changes.");

        return;
      }

      if (!validateRotationRules(formData)) {
        return;
      }
    }

    if (isAddNew) {
      await handleSubmitNew(formData);

      return;
    }

    await handleUpdate(formData);
  };

  const onClickDelete = (rowData: ShiftRule) => {
    confirmDialog({
      header: "Delete Shift Rule",
      message: (
        <div className="flex flex-col gap-1">
          <span className="text-slate-600">
            Are you sure you want to delete this shift rule?
          </span>

          <span className="font-semibold text-slate-800">{rowData.name}</span>
        </div>
      ),
      icon: "pi pi-exclamation-triangle",
      defaultFocus: "reject",
      accept: () => handleDelete(rowData),
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

  const onClickRestore = (rowData: ShiftRule) => {
    confirmDialog({
      header: "Restore Shift Rule",
      message: (
        <div className="flex flex-col gap-1">
          <span className="text-slate-600">
            Are you sure you want to restore this shift rule?
          </span>

          <span className="font-semibold text-slate-800">{rowData.name}</span>
        </div>
      ),
      icon: "pi pi-refresh",
      defaultFocus: "accept",
      accept: () => handleRestore(rowData),
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

  const onClickPurge = (rowData: ShiftRule) => {
    confirmDialog({
      header: "Delete Shift Rule Permanently",
      message: (
        <div className="flex flex-col gap-2">
          <span className="text-slate-600">
            This action cannot be undone. Permanently delete:
          </span>

          <span className="font-semibold text-slate-800">{rowData.name}</span>
        </div>
      ),
      icon: "pi pi-exclamation-triangle",
      defaultFocus: "reject",
      accept: () => handlePurge(rowData),
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

  const scheduleTypeColumnBody = (rowData: ShiftRule) => {
    if (rowData.schedule_type === "FIXED") {
      return <Tag value="Fixed" severity="info" icon="pi pi-lock" rounded />;
    }

    if (rowData.schedule_type === "ROTATION") {
      return (
        <Tag value="Rotation" severity="warning" icon="pi pi-refresh" rounded />
      );
    }

    return <Tag value="Unknown" severity="secondary" rounded />;
  };

  const statusColumnBody = (rowData: ShiftRule) => {
    if (rowData.deleted_at) {
      return (
        <Tag value="Deleted" severity="secondary" icon="pi pi-trash" rounded />
      );
    }

    if (rowData.is_active) {
      return (
        <Tag
          value="Active"
          severity="success"
          icon="pi pi-check-circle"
          rounded
        />
      );
    }

    return (
      <Tag
        value="Inactive"
        severity="warning"
        icon="pi pi-minus-circle"
        rounded
      />
    );
  };

  const baseShiftColumnBody = (rowData: ShiftRule) => {
    if (rowData.schedule_type !== "FIXED") {
      return <span className="text-sm text-slate-400">-</span>;
    }

    const shiftName = shiftNameMap.get(String(rowData.base_shift_id ?? ""));

    if (!shiftName) {
      return (
        <span className="text-sm text-slate-500">
          Shift {rowData.base_shift_id ?? "-"}
        </span>
      );
    }

    return <span className="font-medium text-slate-700">{shiftName}</span>;
  };

  const rotationModeColumnBody = (rowData: ShiftRule) => {
    if (rowData.schedule_type !== "ROTATION") {
      return <span className="text-sm text-slate-400">-</span>;
    }

    const option = ROTATION_MODE_OPTIONS.find(
      (item) => item.value === rowData.rotation_mode,
    );

    return (
      <span className="text-sm text-slate-700">
        {option?.label ?? rowData.rotation_mode ?? "-"}
      </span>
    );
  };

  const shiftChangeColumnBody = (rowData: ShiftRule) => {
    if (
      rowData.schedule_type !== "ROTATION" ||
      rowData.rotation_mode !== "CHANGE_ON_DAY"
    ) {
      return <span className="text-sm text-slate-400">-</span>;
    }

    const option = CHANGE_DAY_OPTIONS.find(
      (item) => item.value === rowData.change_day,
    );

    return (
      <span className="text-sm text-slate-700">
        {option?.label ?? rowData.change_day ?? "-"}
      </span>
    );
  };

  const patternSummaryColumnBody = (rowData: ShiftRule) => {
    if (rowData.schedule_type !== "ROTATION" || !rowData.rules?.length) {
      return <span className="text-sm text-slate-400">-</span>;
    }

    const orderedRules = [...rowData.rules].sort(
      (first, second) =>
        Number(first.sequence_no ?? 0) - Number(second.sequence_no ?? 0),
    );

    return (
      <div className="flex max-w-sm flex-col gap-1">
        {orderedRules.slice(0, 3).map((rule, index) => {
          const shiftName =
            shiftNameMap.get(String(rule.shift_id ?? "")) ??
            `Shift ${rule.shift_id}`;

          const durationText =
            rowData.rotation_mode === "ROLLING"
              ? ` · ${Number(rule.duration_days ?? 0)} day(s)`
              : "";

          return (
            <span
              key={`${rule.sequence_no}-${rule.shift_id}-${index}`}
              className="truncate text-sm text-slate-700"
              title={`${rule.sequence_no}. ${shiftName}${durationText}`}
            >
              {rule.sequence_no}. {shiftName}
              {durationText}
            </span>
          );
        })}

        {orderedRules.length > 3 && (
          <span className="text-xs text-slate-500">
            +{orderedRules.length - 3} more pattern(s)
          </span>
        )}
      </div>
    );
  };

  const actionColumnBody = (rowData: ShiftRule) => {
    const isDeleted = Boolean(rowData.deleted_at);

    const isSuperadmin = hasRole(profileState.role, ["superadmin"]);

    if (isDeleted) {
      if (!isSuperadmin) {
        return <span className="text-sm text-slate-400">No action</span>;
      }

      return (
        <div className="flex flex-nowrap items-center justify-end gap-2">
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
            onClick={() => onClickRestore(rowData)}
          />

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
            onClick={() => onClickPurge(rowData)}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-nowrap items-center justify-end gap-2">
        <Button
          type="button"
          icon="pi pi-pencil"
          rounded
          outlined
          severity="secondary"
          size="small"
          tooltip="Edit"
          tooltipOptions={{
            appendTo: getBody,
            position: "top",
          }}
          onClick={() => onClickUpdate(rowData)}
        />

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
          onClick={() => onClickDelete(rowData)}
        />
      </div>
    );
  };

  const allDataValidating = isValidating || shiftIsValidating;

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
        onClick={handleCloseDialog}
      />

      <Button
        type="submit"
        form="shift-rule-form"
        label={isAddNew ? "Create Shift Rule" : "Save Changes"}
        icon="pi pi-check"
        loading={isSaving}
        disabled={isSaving || shiftIsLoading || Boolean(shiftError)}
        className="w-full sm:w-auto"
      />
    </div>
  );

  if (isLoading) {
    return <LoadingDataTable />;
  }

  if (error) {
    return <ErrorNotConnectedToApi mutateKey={currentKey} />;
  }

  return (
    <>
      <ConfirmDialog />

      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
          {/* Page Header */}
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:flex">
                <i className="pi pi-sliders-h text-xl" />
              </div>

              <div className="min-w-0">
                <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
                  Shift Rule
                </h1>

                <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                  Manage fixed schedules, rotation patterns, and shift-change
                  policies.
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                type="button"
                label="Refresh"
                icon="pi pi-refresh"
                severity="secondary"
                outlined
                size="small"
                loading={allDataValidating}
                disabled={allDataValidating}
                className="w-full sm:w-auto"
                onClick={handleRefresh}
              />

              <Button
                type="button"
                label="New Shift Rule"
                icon="pi pi-plus"
                size="small"
                className="w-full sm:w-auto"
                onClick={onClickNew}
              />
            </div>
          </div>

          {/* Table Toolbar */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                inputId="showDeletedData"
                checked={isShowDeletedDataChecked}
                onChange={(event) =>
                  onShowDeletedChange(Boolean(event.checked))
                }
              />

              <label
                htmlFor="showDeletedData"
                className="cursor-pointer select-none text-sm text-slate-600"
              >
                Show deleted records
              </label>
            </div>

            <IconField iconPosition="left" className="w-full md:w-80">
              <InputIcon className="pi pi-search" />

              <InputText
                value={globalFilterValue}
                onChange={onGlobalFilterChange}
                placeholder="Search shift rule name"
                className="w-full"
              />
            </IconField>
          </div>

          {/* Shift Rule Table */}
          <div className="w-full overflow-hidden">
            <DataTable
              value={shiftRuleData ?? []}
              dataKey="id"
              filters={filters}
              globalFilterFields={[
                "name",
                "schedule_type",
                "rotation_mode",
                "change_day",
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
              tableStyle={{
                minWidth: "90rem",
              }}
              emptyMessage="No shift rule data found."
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
                field="name"
                header="Rule Name"
                sortable
                style={{
                  minWidth: "18rem",
                }}
                body={(rowData: ShiftRule) => (
                  <span className="font-medium text-slate-800">
                    {rowData.name}
                  </span>
                )}
              />

              <Column
                field="schedule_type"
                header="Schedule Type"
                sortable
                body={scheduleTypeColumnBody}
                style={{
                  minWidth: "13rem",
                }}
              />

              <Column
                field="rotation_mode"
                header="Rotation Mode"
                sortable
                body={rotationModeColumnBody}
                style={{
                  minWidth: "17rem",
                }}
              />

              <Column
                field="change_day"
                header="Shift Change"
                sortable
                body={shiftChangeColumnBody}
                style={{
                  minWidth: "13rem",
                }}
              />

              <Column
                field="base_shift_id"
                header="Base Shift"
                sortable
                body={baseShiftColumnBody}
                style={{
                  minWidth: "16rem",
                }}
              />

              <Column
                header="Rotation Pattern"
                body={patternSummaryColumnBody}
                style={{
                  minWidth: "23rem",
                }}
              />

              <Column
                field="is_active"
                header="Status"
                sortable
                body={statusColumnBody}
                style={{
                  minWidth: "10rem",
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
                  width: "9rem",
                  minWidth: "9rem",
                  textAlign: "right",
                }}
                bodyStyle={{
                  width: "9rem",
                  minWidth: "9rem",
                }}
              />
            </DataTable>
          </div>
        </div>
      </Card>

      {/* Shift Rule Form Dialog */}
      <Dialog
        header={popupHeaderTitle}
        visible={visible}
        style={{
          width: "95vw",
          maxWidth: "68rem",
        }}
        breakpoints={{
          "960px": "90vw",
          "640px": "95vw",
        }}
        footer={dialogFooter}
        modal
        draggable={false}
        resizable={false}
        closeOnEscape={!isSaving}
        closable={!isSaving}
        onHide={handleCloseDialog}
        onShow={() => {
          setTimeout(() => {
            setFocus("name");
          }, 0);
        }}
      >
        <form
          id="shift-rule-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-6 pt-2"
        >
          {/* General Information */}
          <section className="flex flex-col gap-4">
            <div className="border-b border-slate-200 pb-2">
              <h2 className="m-0 text-sm font-semibold text-slate-800">
                General Information
              </h2>

              <p className="m-0 mt-1 text-xs text-slate-500">
                Define the rule name, schedule type, and active status.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="name"
                className="text-sm font-medium text-slate-700"
              >
                Rule Name
                <span className="ml-1 text-red-500">*</span>
              </label>

              <Controller
                name="name"
                control={control}
                rules={{
                  required: "Shift rule name is required.",
                  maxLength: {
                    value: 50,
                    message: "Shift rule name cannot exceed 50 characters.",
                  },
                }}
                render={({ field, fieldState }) => (
                  <>
                    <InputText
                      {...field}
                      id="name"
                      autoComplete="off"
                      placeholder="Example: Security Weekly Rotation"
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

            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-slate-700">
                Schedule Type
                <span className="ml-1 text-red-500">*</span>
              </label>

              <Controller
                name="schedule_type"
                control={control}
                rules={{
                  required: "Schedule type is required.",
                }}
                render={({ field, fieldState }) => (
                  <>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label
                        htmlFor="schedule_type_fixed"
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                          field.value === "FIXED"
                            ? "border-blue-300 bg-blue-50"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <RadioButton
                          inputId="schedule_type_fixed"
                          value="FIXED"
                          checked={field.value === "FIXED"}
                          onChange={() => {
                            field.onChange("FIXED");

                            setValue("rotation_mode", null, {
                              shouldDirty: true,
                            });

                            setValue("change_day", null, {
                              shouldDirty: true,
                            });

                            replace([]);
                          }}
                        />

                        <div>
                          <p className="m-0 text-sm font-semibold text-slate-800">
                            Fixed Schedule
                          </p>

                          <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                            Employees use one base shift continuously.
                          </p>
                        </div>
                      </label>

                      <label
                        htmlFor="schedule_type_rotation"
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                          field.value === "ROTATION"
                            ? "border-blue-300 bg-blue-50"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <RadioButton
                          inputId="schedule_type_rotation"
                          value="ROTATION"
                          checked={field.value === "ROTATION"}
                          onChange={() => {
                            field.onChange("ROTATION");

                            setValue("base_shift_id", 0, {
                              shouldDirty: true,
                            });

                            const currentMode =
                              getValues("rotation_mode") ?? "ROLLING";

                            setValue("rotation_mode", currentMode, {
                              shouldDirty: true,
                            });

                            const currentRules = getValues("rules") ?? [];

                            if (currentRules.length === 0) {
                              append(createDefaultRule(1));
                            }
                          }}
                        />

                        <div>
                          <p className="m-0 text-sm font-semibold text-slate-800">
                            Rotation Schedule
                          </p>

                          <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                            Employees move through multiple shifts in a defined
                            order.
                          </p>
                        </div>
                      </label>
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
          </section>

          {/* Fixed Schedule */}
          {watchedScheduleType === "FIXED" && (
            <section className="flex flex-col gap-4">
              <div className="border-b border-slate-200 pb-2">
                <h2 className="m-0 text-sm font-semibold text-slate-800">
                  Fixed Schedule
                </h2>

                <p className="m-0 mt-1 text-xs text-slate-500">
                  Select the single shift used by this rule.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="base_shift_id"
                  className="text-sm font-medium text-slate-700"
                >
                  Base Shift
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <Controller
                  name="base_shift_id"
                  control={control}
                  rules={{
                    validate: (value) =>
                      watchedScheduleType !== "FIXED" ||
                      Number(value) > 0 ||
                      "Base shift is required.",
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <Dropdown
                        id="base_shift_id"
                        appendTo={getBody}
                        value={
                          Number(field.value ?? 0) > 0 ? field.value : null
                        }
                        options={shiftOptions}
                        optionLabel="name"
                        optionValue="id"
                        filter
                        loading={shiftIsLoading}
                        disabled={shiftIsLoading || Boolean(shiftError)}
                        placeholder={
                          shiftIsLoading
                            ? "Loading shifts..."
                            : "Select a base shift"
                        }
                        className={`w-full ${
                          fieldState.invalid ? "p-invalid" : ""
                        }`}
                        onChange={(event) => field.onChange(event.value)}
                      />

                      {fieldState.error && (
                        <small className="p-error">
                          {fieldState.error.message}
                        </small>
                      )}

                      {!fieldState.error && !shiftError && (
                        <small className="text-slate-500">
                          This shift is assigned continuously while the rule is
                          active.
                        </small>
                      )}

                      {shiftError && (
                        <small className="p-error">
                          Shifts could not be loaded. Refresh the page and try
                          again.
                        </small>
                      )}
                    </>
                  )}
                />
              </div>
            </section>
          )}

          {/* Rotation Schedule */}
          {watchedScheduleType === "ROTATION" && (
            <section className="flex flex-col gap-5">
              <div className="border-b border-slate-200 pb-2">
                <h2 className="m-0 text-sm font-semibold text-slate-800">
                  Rotation Configuration
                </h2>

                <p className="m-0 mt-1 text-xs text-slate-500">
                  Configure when shifts change and the sequence used by the
                  rotation.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="rotation_mode"
                    className="text-sm font-medium text-slate-700"
                  >
                    Rotation Mode
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <Controller
                    name="rotation_mode"
                    control={control}
                    rules={{
                      validate: (value) =>
                        watchedScheduleType !== "ROTATION" ||
                        Boolean(value) ||
                        "Rotation mode is required.",
                    }}
                    render={({ field, fieldState }) => (
                      <>
                        <Dropdown
                          id="rotation_mode"
                          appendTo={getBody}
                          value={field.value ?? null}
                          options={ROTATION_MODE_OPTIONS}
                          optionLabel="label"
                          optionValue="value"
                          placeholder="Select rotation mode"
                          className={`w-full ${
                            fieldState.invalid ? "p-invalid" : ""
                          }`}
                          onChange={(event) => {
                            field.onChange(event.value);

                            if (event.value !== "CHANGE_ON_DAY") {
                              setValue("change_day", null, {
                                shouldDirty: true,
                              });
                            }

                            if (event.value === "CHANGE_ON_DAY") {
                              const currentRules = getValues("rules") ?? [];

                              replace(
                                currentRules.map((rule) => ({
                                  ...rule,
                                  shift_id: String(rule.shift_id ?? ""),
                                  duration_days: 1,
                                })),
                              );
                            }
                          }}
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

                {watchedRotationMode === "CHANGE_ON_DAY" && (
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="change_day"
                      className="text-sm font-medium text-slate-700"
                    >
                      Change Shift On
                      <span className="ml-1 text-red-500">*</span>
                    </label>

                    <Controller
                      name="change_day"
                      control={control}
                      rules={{
                        validate: (value) =>
                          watchedRotationMode !== "CHANGE_ON_DAY" ||
                          Boolean(value) ||
                          "Shift change day is required.",
                      }}
                      render={({ field, fieldState }) => (
                        <>
                          <Dropdown
                            id="change_day"
                            appendTo={getBody}
                            value={field.value ?? null}
                            options={CHANGE_DAY_OPTIONS}
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Select a day"
                            className={`w-full ${
                              fieldState.invalid ? "p-invalid" : ""
                            }`}
                            onChange={(event) => field.onChange(event.value)}
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
                )}
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                <i className="pi pi-info-circle mt-0.5" />

                <span>
                  {watchedRotationMode === "CHANGE_ON_DAY"
                    ? "The next pattern begins whenever the selected weekday is reached. Each row therefore uses one rotation step."
                    : "Rolling rotation follows the duration configured for each pattern row before moving to the next shift."}
                </span>
              </div>

              {/* Rotation Pattern */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="m-0 text-sm font-semibold text-slate-800">
                      Rotation Pattern
                    </h3>

                    <p className="m-0 mt-1 text-xs text-slate-500">
                      Define the ordered shifts used by this rotation rule.
                    </p>
                  </div>

                  <Button
                    type="button"
                    label="Add Pattern"
                    icon="pi pi-plus"
                    outlined
                    size="small"
                    className="w-full sm:w-auto"
                    onClick={() => append(createDefaultRule(fields.length + 1))}
                  />
                </div>

                {fields.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
                    <i className="pi pi-refresh mb-3 text-2xl text-slate-400" />

                    <p className="m-0 text-sm font-medium text-slate-700">
                      No rotation pattern
                    </p>

                    <p className="m-0 mt-1 text-xs text-slate-500">
                      Add at least one shift to create a rotation schedule.
                    </p>
                  </div>
                ) : (
                  <div className="flex max-h-[26rem] flex-col gap-3 overflow-y-auto pr-1">
                    {fields.map((pattern, index) => (
                      <div
                        key={pattern.fieldKey}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-semibold text-slate-700 shadow-sm">
                              {index + 1}
                            </div>

                            <span className="text-sm font-semibold text-slate-700">
                              Pattern {index + 1}
                            </span>
                          </div>

                          <Button
                            type="button"
                            icon="pi pi-trash"
                            rounded
                            text
                            severity="danger"
                            tooltip="Remove pattern"
                            tooltipOptions={{
                              appendTo: getBody,
                              position: "top",
                            }}
                            onClick={() => normalizeRulesAfterRemoval(index)}
                          />
                        </div>

                        <div
                          className={`grid grid-cols-1 gap-4 ${
                            watchedRotationMode === "ROLLING"
                              ? "md:grid-cols-[8rem_minmax(0,1fr)_12rem]"
                              : "md:grid-cols-[8rem_minmax(0,1fr)]"
                          }`}
                        >
                          <div className="flex flex-col gap-2">
                            <label
                              htmlFor={`rules-${index}-sequence`}
                              className="text-sm font-medium text-slate-700"
                            >
                              Sequence
                            </label>

                            <Controller
                              name={`rules.${index}.sequence_no`}
                              control={control}
                              rules={{
                                required: "Required.",
                                min: {
                                  value: 1,
                                  message: "Minimum 1.",
                                },
                              }}
                              render={({ field, fieldState }) => (
                                <>
                                  <InputNumber
                                    id={`rules-${index}-sequence`}
                                    inputRef={field.ref}
                                    value={Number(field.value ?? index + 1)}
                                    min={1}
                                    useGrouping={false}
                                    className={`w-full ${
                                      fieldState.invalid ? "p-invalid" : ""
                                    }`}
                                    onBlur={field.onBlur}
                                    onValueChange={(event) =>
                                      field.onChange(event.value ?? index + 1)
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
                              htmlFor={`rules-${index}-shift`}
                              className="text-sm font-medium text-slate-700"
                            >
                              Shift
                              <span className="ml-1 text-red-500">*</span>
                            </label>

                            <Controller
                              name={`rules.${index}.shift_id`}
                              control={control}
                              rules={{
                                validate: (value) =>
                                  Boolean(String(value ?? "").trim()) ||
                                  "Shift is required.",
                              }}
                              render={({ field, fieldState }) => (
                                <>
                                  <Dropdown
                                    id={`rules-${index}-shift`}
                                    appendTo={getBody}
                                    value={
                                      field.value ? String(field.value) : null
                                    }
                                    options={shiftDropdownOptions}
                                    optionLabel="name"
                                    optionValue="option_value"
                                    filter
                                    loading={shiftIsLoading}
                                    disabled={
                                      shiftIsLoading || Boolean(shiftError)
                                    }
                                    placeholder="Select shift"
                                    className={`w-full ${
                                      fieldState.invalid ? "p-invalid" : ""
                                    }`}
                                    onChange={(event) =>
                                      field.onChange(
                                        event.value ? String(event.value) : "",
                                      )
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

                          {watchedRotationMode === "ROLLING" && (
                            <div className="flex flex-col gap-2">
                              <label
                                htmlFor={`rules-${index}-duration`}
                                className="text-sm font-medium text-slate-700"
                              >
                                Duration
                              </label>

                              <Controller
                                name={`rules.${index}.duration_days`}
                                control={control}
                                rules={{
                                  required: "Required.",
                                  min: {
                                    value: 1,
                                    message: "Minimum 1 day.",
                                  },
                                }}
                                render={({ field, fieldState }) => (
                                  <>
                                    <InputNumber
                                      id={`rules-${index}-duration`}
                                      inputRef={field.ref}
                                      value={Number(field.value ?? 1)}
                                      min={1}
                                      useGrouping={false}
                                      suffix=" day(s)"
                                      className={`w-full ${
                                        fieldState.invalid ? "p-invalid" : ""
                                      }`}
                                      onBlur={field.onBlur}
                                      onValueChange={(event) =>
                                        field.onChange(event.value ?? 1)
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
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {shiftError && (
                  <small className="p-error">
                    Shifts could not be loaded. Refresh the page and try again.
                  </small>
                )}
              </div>
            </section>
          )}

          {/* Active Status */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Controller
              name="is_active"
              control={control}
              defaultValue
              render={({ field }) => (
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <label
                      htmlFor="is_active"
                      className="cursor-pointer text-sm font-medium text-slate-700"
                    >
                      Active Status
                    </label>

                    <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                      Inactive shift rules remain stored but should not be
                      available for new employee shift assignments.
                    </p>
                  </div>

                  <InputSwitch
                    id="is_active"
                    checked={Boolean(field.value)}
                    onChange={(event) => field.onChange(event.value)}
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

export default ShiftRuleTableData;
