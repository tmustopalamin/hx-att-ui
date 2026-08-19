"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { MultiSelect } from "primereact/multiselect";
import { Tag } from "primereact/tag";

import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import PrimeDatePicker from "@/app/_components/PrimeDatePicker";
import {
  createPositionAllowancePolicy,
  createPositionAllowanceVersion,
  getPositionAllowanceOptions,
  getPositionAllowancePolicies,
  previewPositionAllowancePolicy,
  setPositionAllowanceStatus,
  updatePositionAllowancePolicy,
} from "@/app/services/position-allowance-service";
import type {
  PositionAllowancePolicy,
  PositionAllowancePolicyPayload,
  PositionAllowanceOptions,
  PositionAllowancePreview,
} from "@/app/types/position-allowance";
import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import type { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";

type FormPosition = {
  position_id: number;
  monthly_amount: number | null;
};

type FormExclusion = {
  employee_id: number;
  reason: string;
};

type PolicyForm = {
  code: string;
  name: string;
  income_component_id: number | null;
  effective_from: string;
  effective_to: string;
  positions: FormPosition[];
  exclusions: FormExclusion[];
};

const emptyForm = (): PolicyForm => ({
  code: "",
  name: "",
  income_component_id: null,
  effective_from: "",
  effective_to: "",
  positions: [],
  exclusions: [],
});

const formatCurrency = (value: string | number | null | undefined) => {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(amount)
    : "-";
};

const addOneDay = (value: string) => {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};

const todayIso = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

const POSITION_ALLOWANCE_ERROR_MESSAGES: Record<string, string> = {
  POSITION_ALLOWANCE_INVALID:
    "Check the policy dates, selected positions, amounts, and exclusion reasons.",
  POSITION_ALLOWANCE_NOT_FOUND:
    "This policy is no longer available. Refresh the list and try again.",
  POSITION_ALLOWANCE_COMPONENT_INVALID:
    "Select an active fixed-amount income component from Payroll > Income Component.",
  POSITION_ALLOWANCE_POSITION_INVALID:
    "One or more selected positions are inactive or no longer available. Reload the options and select active positions.",
  POSITION_ALLOWANCE_EMPLOYEE_INVALID:
    "One or more excluded employees are inactive or no longer available. Reload the options and update the exclusions.",
  POSITION_ALLOWANCE_OVERLAP:
    "The effective period overlaps another published or retired policy for the same income component and position. Adjust the dates or retire the previous policy first.",
  POSITION_ALLOWANCE_MANUAL_ASSIGNMENT_CONFLICT:
    "The income component is manually assigned to an employee during this policy period. Remove or end that assignment, or adjust the policy period.",
  POSITION_ALLOWANCE_STATUS_INVALID:
    "This lifecycle transition is no longer valid. Refresh the policy list and try again.",
  POSITION_ALLOWANCE_IMMUTABLE:
    "Published and retired policies cannot be edited. Create a new version instead.",
  POSITION_ALLOWANCE_EXISTS:
    "A policy with this code and version already exists. Use a different policy code or refresh the list.",
  PRECONDITION_FAILED:
    "This policy changed after it was loaded. Refresh the policy list and retry using the latest row version.",
  DATABASE_ERROR:
    "The policy could not be processed because of a server error. Try again later or contact an administrator.",
};

export default function PositionAllowanceData() {
  const dispatch = useDispatch();
  const permissions = useSelector(
    (state: RootState) => state.profile.permissions,
  );
  const canManage = permissions.includes("payroll-config.manage");
  const [includeAll, setIncludeAll] = useState(true);
  const [editorVisible, setEditorVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [versionVisible, setVersionVisible] = useState(false);
  const [retireVisible, setRetireVisible] = useState(false);
  const [selected, setSelected] = useState<PositionAllowancePolicy | null>(
    null,
  );
  const [statusTarget, setStatusTarget] =
    useState<PositionAllowancePolicy | null>(null);
  const [form, setForm] = useState<PolicyForm>(emptyForm);
  const [versionFrom, setVersionFrom] = useState("");
  const [versionTo, setVersionTo] = useState("");
  const [retireTo, setRetireTo] = useState("");
  const [preview, setPreview] = useState<PositionAllowancePreview | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const listKey = `position-allowance-policies-${includeAll}`;

  const {
    data: policies,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<PositionAllowancePolicy[]>(listKey, () =>
    getPositionAllowancePolicies(includeAll),
  );
  const {
    data: options,
    error: optionsError,
    isLoading: optionsLoading,
    isValidating: optionsValidating,
    mutate: mutateOptions,
  } = useSWR<PositionAllowanceOptions>(
    canManage ? "position-allowance-options" : null,
    getPositionAllowanceOptions,
  );
  const optionsReady = Boolean(options) && !optionsError;

  const positionOptions = useMemo(
    () =>
      (options?.positions ?? []).map((position) => ({
        label: position.code
          ? `${position.code} — ${position.name}`
          : position.name,
        value: position.id,
      })),
    [options?.positions],
  );
  const incomeComponentOptions = useMemo(
    () =>
      (options?.income_components ?? []).map((component) => ({
        label: `${component.code ?? "-"} — ${component.name}`,
        value: component.id,
      })),
    [options?.income_components],
  );
  const employeeOptions = useMemo(
    () =>
      (options?.employees ?? []).map((employee) => ({
        label: `${employee.code} — ${employee.name}`,
        value: employee.id,
      })),
    [options?.employees],
  );

  const notify = (
    severity: "success" | "error",
    summary: string,
    detail: string,
  ) => {
    dispatch(showToast({ visible: true, severity, summary, detail }));
  };

  const retryOptions = () => {
    void mutateOptions().catch(() => undefined);
  };

  const showError = (requestError: unknown) => {
    if (isResponseTypeError(requestError)) {
      const code = requestError.code.trim().toUpperCase();
      const mappedMessage = POSITION_ALLOWANCE_ERROR_MESSAGES[code];
      const detail =
        mappedMessage ??
        `${getErrorMessage(requestError, "code")}${
          code ? ` (Code: ${code})` : ""
        }`;
      notify("error", "Position Allowance", detail);
      return;
    }

    notify(
      "error",
      "Position Allowance",
      requestError instanceof Error
        ? requestError.message
        : "An unexpected error occurred.",
    );
  };

  const ensureOptionsReady = () => {
    if (optionsError) {
      notify(
        "error",
        "Position Allowance options unavailable",
        "Positions, income components, and employees could not be loaded. Retry the options request before editing a policy.",
      );
      retryOptions();
      return false;
    }
    if (optionsLoading || !options) {
      notify(
        "error",
        "Position Allowance options loading",
        "Wait for the position allowance options to finish loading before editing a policy.",
      );
      return false;
    }
    return true;
  };

  const closeEditor = () => {
    setEditorVisible(false);
    setSelected(null);
    setForm(emptyForm());
  };

  const openNew = () => {
    if (!ensureOptionsReady()) return;
    setSelected(null);
    setForm(emptyForm());
    setEditorVisible(true);
  };

  const openEdit = (policy: PositionAllowancePolicy) => {
    if (!ensureOptionsReady()) return;
    setSelected(policy);
    setForm({
      code: policy.code,
      name: policy.name,
      income_component_id: policy.income_component_id,
      effective_from: policy.effective_from,
      effective_to: policy.effective_to ?? "",
      positions: policy.positions.map((position) => ({
        position_id: position.id,
        monthly_amount: Number(position.monthly_amount),
      })),
      exclusions: policy.exclusions.map((exclusion) => ({
        employee_id: exclusion.employee_id,
        reason: exclusion.reason,
      })),
    });
    setEditorVisible(true);
  };

  const buildPayload = (): PositionAllowancePolicyPayload | null => {
    const code = form.code.trim().toUpperCase();
    const name = form.name.trim();
    if (
      !code ||
      !name ||
      !form.income_component_id ||
      !form.effective_from ||
      (form.effective_to && form.effective_to < form.effective_from) ||
      form.positions.length === 0 ||
      form.positions.some(
        (position) => !position.monthly_amount || position.monthly_amount <= 0,
      ) ||
      form.exclusions.some((exclusion) => !exclusion.reason.trim())
    ) {
      notify(
        "error",
        "Validation",
        "Code, name, fixed-amount income component, dates, and an amount for every position are required. Exclusion reasons cannot be empty.",
      );
      return null;
    }
    return {
      code,
      name,
      income_component_id: form.income_component_id,
      effective_from: form.effective_from,
      effective_to: form.effective_to || null,
      positions: form.positions.map((position) => ({
        position_id: position.position_id,
        monthly_amount: position.monthly_amount as number,
      })),
      exclusions: form.exclusions.map((exclusion) => ({
        employee_id: exclusion.employee_id,
        reason: exclusion.reason.trim(),
      })),
    };
  };

  const save = async () => {
    if (!ensureOptionsReady()) return;
    const payload = buildPayload();
    if (!payload) return;
    setSaving(true);
    try {
      if (selected) {
        await updatePositionAllowancePolicy(
          selected.id,
          selected.row_version,
          payload,
        );
      } else {
        await createPositionAllowancePolicy(payload);
      }
      await mutate();
      closeEditor();
      notify(
        "success",
        "Saved",
        `Position allowance ${selected ? "draft updated" : "draft created"}.`,
      );
    } catch (requestError) {
      showError(requestError);
    } finally {
      setSaving(false);
    }
  };

  const previewPolicy = async () => {
    if (!ensureOptionsReady()) return;
    const payload = buildPayload();
    if (!payload) return;
    setPreviewing(true);
    try {
      setPreview(
        await previewPositionAllowancePolicy(payload, form.effective_from),
      );
      setPreviewVisible(true);
    } catch (requestError) {
      showError(requestError);
    } finally {
      setPreviewing(false);
    }
  };

  const publish = async (policy: PositionAllowancePolicy) => {
    setSaving(true);
    try {
      await setPositionAllowanceStatus(
        policy.id,
        policy.row_version,
        "PUBLISHED",
        policy.effective_to,
      );
      await mutate();
      notify(
        "success",
        "Published",
        `${policy.code} is now active for payroll.`,
      );
    } catch (requestError) {
      showError(requestError);
    } finally {
      setSaving(false);
    }
  };

  const openRetire = (policy: PositionAllowancePolicy) => {
    setStatusTarget(policy);
    setRetireTo(policy.effective_to ?? todayIso());
    setRetireVisible(true);
  };

  const retire = async () => {
    if (!statusTarget) return;
    if (!retireTo) {
      notify(
        "error",
        "Validation",
        "An effective to date is required when retiring a policy.",
      );
      return;
    }
    if (retireTo && retireTo < statusTarget.effective_from) {
      notify(
        "error",
        "Validation",
        "Retirement date cannot be before effective from.",
      );
      return;
    }
    setSaving(true);
    try {
      await setPositionAllowanceStatus(
        statusTarget.id,
        statusTarget.row_version,
        "RETIRED",
        retireTo || null,
      );
      await mutate();
      setRetireVisible(false);
      setStatusTarget(null);
      notify("success", "Retired", `${statusTarget.code} was retired.`);
    } catch (requestError) {
      showError(requestError);
    } finally {
      setSaving(false);
    }
  };

  const openVersion = (policy: PositionAllowancePolicy) => {
    if (!ensureOptionsReady()) return;
    setStatusTarget(policy);
    setVersionFrom(
      policy.effective_to
        ? addOneDay(policy.effective_to)
        : policy.effective_from,
    );
    setVersionTo("");
    setVersionVisible(true);
  };

  const createVersion = async () => {
    if (!statusTarget || !versionFrom) {
      notify(
        "error",
        "Validation",
        "A new version effective date is required.",
      );
      return;
    }
    if (versionTo && versionTo < versionFrom) {
      notify(
        "error",
        "Validation",
        "Effective to cannot be before effective from.",
      );
      return;
    }
    setSaving(true);
    try {
      const draft = await createPositionAllowanceVersion(
        statusTarget.id,
        statusTarget.row_version,
        versionFrom,
        versionTo || null,
      );
      await mutate();
      setVersionVisible(false);
      setStatusTarget(null);
      openEdit(draft);
      notify(
        "success",
        "Draft version created",
        "Complete the draft before publishing it.",
      );
    } catch (requestError) {
      showError(requestError);
    } finally {
      setSaving(false);
    }
  };

  const updateSelectedPositions = (ids: number[]) => {
    setForm((current) => ({
      ...current,
      positions: ids.map(
        (id) =>
          current.positions.find((position) => position.position_id === id) ?? {
            position_id: id,
            monthly_amount: null,
          },
      ),
    }));
  };

  const updateSelectedExclusions = (ids: number[]) => {
    setForm((current) => ({
      ...current,
      exclusions: ids.map(
        (id) =>
          current.exclusions.find(
            (exclusion) => exclusion.employee_id === id,
          ) ?? { employee_id: id, reason: "" },
      ),
    }));
  };

  if (isLoading) return <LoadingDataTable />;
  if (error) return <ErrorNotConnectedToApi mutateKey={listKey} />;

  return (
    <>
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 sm:flex">
                <i className="pi pi-briefcase text-xl" />
              </div>
              <div>
                <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
                  Position Allowance
                </h1>
                <p className="m-0 mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                  Monthly fixed allowance by position. Payroll uses the employee
                  position effective on payroll date, pays the full monthly
                  amount without proration, and snapshots the policy during
                  validation.
                </p>
              </div>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button
                type="button"
                label="Refresh"
                icon="pi pi-refresh"
                severity="secondary"
                outlined
                size="small"
                loading={isValidating}
                onClick={() => void mutate()}
              />
              {canManage && (
                <Button
                  type="button"
                  label="New Policy"
                  icon="pi pi-plus"
                  size="small"
                  disabled={!optionsReady}
                  loading={optionsLoading && !options}
                  onClick={openNew}
                />
              )}
            </div>
          </div>

          {canManage && !optionsReady && (
            <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <i
                  className={`pi mt-0.5 ${
                    optionsError
                      ? "pi-exclamation-triangle"
                      : "pi-spin pi-spinner"
                  }`}
                />
                <span>
                  {optionsError
                    ? "Required position allowance options could not be loaded. Retry before creating or editing a policy."
                    : "Loading positions, income components, and employees for the policy editor..."}
                </span>
              </div>
              {optionsError && (
                <Button
                  type="button"
                  label="Retry Options"
                  icon="pi pi-refresh"
                  severity="warning"
                  outlined
                  size="small"
                  loading={optionsValidating}
                  onClick={retryOptions}
                />
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="font-medium">Lifecycle:</span>
            <Tag value="DRAFT" severity="warning" />
            <span>→</span>
            <Tag value="PUBLISHED" severity="success" />
            <span>→</span>
            <Tag value="RETIRED" severity="secondary" />
            <label className="ml-auto flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeAll}
                onChange={(event) => setIncludeAll(event.target.checked)}
              />
              Show all versions
            </label>
          </div>

          <DataTable
            value={policies ?? []}
            dataKey="id"
            paginator
            rows={10}
            stripedRows
            rowHover
            scrollable
            responsiveLayout="scroll"
            size="small"
            loading={isValidating}
            tableStyle={{ minWidth: "78rem" }}
            emptyMessage="No position allowance policy found."
          >
            <Column field="code" header="Code" sortable />
            <Column field="version_no" header="Version" sortable />
            <Column field="name" header="Policy" sortable />
            <Column
              header="Position Amounts"
              body={(row: PositionAllowancePolicy) => (
                <div className="flex flex-col gap-1">
                  {row.positions.map((position) => (
                    <span key={position.id}>
                      {position.name}: {formatCurrency(position.monthly_amount)}
                    </span>
                  ))}
                </div>
              )}
              style={{ minWidth: "20rem" }}
            />
            <Column
              header="Income Component"
              body={(row: PositionAllowancePolicy) =>
                row.income_component_code
                  ? `${row.income_component_code} — ${row.income_component_name}`
                  : row.income_component_name
              }
              style={{ minWidth: "18rem" }}
            />
            <Column
              header="Exclusions"
              body={(row: PositionAllowancePolicy) => row.exclusions.length}
            />
            <Column
              header="Effective"
              body={(row: PositionAllowancePolicy) =>
                `${row.effective_from} — ${row.effective_to ?? "Open"}`
              }
            />
            <Column
              header="Status"
              body={(row: PositionAllowancePolicy) => (
                <Tag
                  value={row.status}
                  severity={
                    row.status === "PUBLISHED"
                      ? "success"
                      : row.status === "DRAFT"
                        ? "warning"
                        : "secondary"
                  }
                />
              )}
            />
            {canManage && (
              <Column
                header="Action"
                body={(row: PositionAllowancePolicy) => (
                  <div className="flex flex-wrap gap-2">
                    {row.status === "DRAFT" && (
                      <>
                        <Button
                          type="button"
                          label="Edit"
                          icon="pi pi-pencil"
                          outlined
                          size="small"
                          onClick={() => openEdit(row)}
                        />
                        <Button
                          type="button"
                          label="Publish"
                          icon="pi pi-check"
                          size="small"
                          loading={saving}
                          onClick={() => void publish(row)}
                        />
                      </>
                    )}
                    {(row.status === "PUBLISHED" ||
                      row.status === "RETIRED") && (
                      <Button
                        type="button"
                        label="New Version"
                        icon="pi pi-copy"
                        outlined
                        size="small"
                        onClick={() => openVersion(row)}
                      />
                    )}
                    {row.status === "PUBLISHED" && (
                      <Button
                        type="button"
                        label="Retire"
                        icon="pi pi-stop-circle"
                        severity="secondary"
                        outlined
                        size="small"
                        onClick={() => openRetire(row)}
                      />
                    )}
                  </div>
                )}
              />
            )}
          </DataTable>
        </div>
      </Card>

      <Dialog
        header={
          selected ? "Edit Position Allowance Draft" : "New Position Allowance"
        }
        visible={editorVisible}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "64rem" }}
        onHide={closeEditor}
        footer={
          <div className="flex justify-between gap-2">
            <Button
              type="button"
              label="Preview Eligibility"
              icon="pi pi-eye"
              severity="secondary"
              outlined
              disabled={!optionsReady}
              loading={previewing}
              onClick={() => void previewPolicy()}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                label="Cancel"
                severity="secondary"
                text
                onClick={closeEditor}
              />
              <Button
                type="button"
                label="Save Draft"
                icon="pi pi-check"
                disabled={!optionsReady}
                loading={saving}
                onClick={() => void save()}
              />
            </div>
          </div>
        }
      >
        <div className="grid gap-4 py-2">
          {!optionsReady && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <i className="pi pi-exclamation-triangle mt-0.5" />
              <span>
                Required editor options are unavailable. Retry the options
                request before saving or previewing this policy.
              </span>
              {optionsError && (
                <Button
                  type="button"
                  label="Retry"
                  icon="pi pi-refresh"
                  severity="warning"
                  text
                  size="small"
                  loading={optionsValidating}
                  onClick={retryOptions}
                />
              )}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Policy Code
              <InputText
                value={form.code}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    code: event.target.value,
                  }))
                }
                placeholder="POSITION_ALLOWANCE"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Policy Name
              <InputText
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Monthly Position Allowance"
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Existing Income Component
            <Dropdown
              value={form.income_component_id}
              options={incomeComponentOptions}
              filter
              className="w-full"
              placeholder="Select FIXED_ALLOWANCE / FIXED_AMOUNT component"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  income_component_id: (event.value as number | null) ?? null,
                }))
              }
            />
            <span className="text-xs font-normal text-slate-500">
              Tax, BPJS, and payslip classification are inherited from Settings
              → Payroll → Income Component.
            </span>
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Eligible Positions
            <MultiSelect
              value={form.positions.map((position) => position.position_id)}
              options={positionOptions}
              filter
              display="chip"
              className="w-full"
              placeholder="Select one or more positions"
              onChange={(event) =>
                updateSelectedPositions((event.value as number[]) ?? [])
              }
            />
          </label>

          {form.positions.length > 0 && (
            <div className="grid gap-2 rounded-lg border border-slate-200 p-3">
              <div className="text-sm font-semibold text-slate-700">
                Monthly amount per position
              </div>
              {form.positions.map((position, index) => {
                const option = options?.positions.find(
                  (item) => item.id === position.position_id,
                );
                return (
                  <div
                    className="grid items-center gap-3 md:grid-cols-[1fr_15rem]"
                    key={position.position_id}
                  >
                    <span className="text-sm text-slate-600">
                      {option?.code
                        ? `${option.code} — ${option.name}`
                        : (option?.name ?? position.position_id)}
                    </span>
                    <InputNumber
                      value={position.monthly_amount}
                      mode="currency"
                      currency="IDR"
                      locale="id-ID"
                      min={0}
                      className="w-full"
                      placeholder="Full monthly amount"
                      onValueChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          positions: current.positions.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, monthly_amount: event.value ?? null }
                              : item,
                          ),
                        }))
                      }
                    />
                  </div>
                );
              })}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Effective From
              <PrimeDatePicker
                value={form.effective_from}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, effective_from: value }))
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Effective To
              <PrimeDatePicker
                value={form.effective_to}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, effective_to: value }))
                }
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Employee Exclusions (optional)
            <MultiSelect
              value={form.exclusions.map((exclusion) => exclusion.employee_id)}
              options={employeeOptions}
              filter
              display="chip"
              className="w-full"
              placeholder="Select employees excluded from this policy"
              onChange={(event) =>
                updateSelectedExclusions((event.value as number[]) ?? [])
              }
            />
          </label>

          {form.exclusions.length > 0 && (
            <div className="grid gap-2 rounded-lg border border-amber-200 bg-amber-50/40 p-3">
              <div className="text-sm font-semibold text-slate-700">
                Exclusion reason per employee
              </div>
              {form.exclusions.map((exclusion, index) => {
                const option = options?.employees.find(
                  (item) => item.id === exclusion.employee_id,
                );
                return (
                  <div
                    className="grid items-center gap-3 md:grid-cols-[18rem_1fr]"
                    key={exclusion.employee_id}
                  >
                    <span className="text-sm text-slate-600">
                      {option?.name ?? exclusion.employee_id}
                    </span>
                    <InputText
                      value={exclusion.reason}
                      placeholder="Reason for exclusion"
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          exclusions: current.exclusions.map(
                            (item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, reason: event.target.value }
                                : item,
                          ),
                        }))
                      }
                    />
                  </div>
                );
              })}
            </div>
          )}

          <p className="m-0 text-xs leading-5 text-slate-500">
            A published policy is immutable. Create a new version for amount,
            position, date, component, or exclusion changes. The same income
            component cannot be manually assigned to an employee during a
            published policy period.
          </p>
        </div>
      </Dialog>

      <Dialog
        header="Position Allowance Eligibility Preview"
        visible={previewVisible}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "72rem" }}
        onHide={() => setPreviewVisible(false)}
      >
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
              Eligible: <strong>{preview?.eligible_count ?? 0}</strong>
            </div>
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              Excluded: <strong>{preview?.excluded_count ?? 0}</strong>
            </div>
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
              Manual conflicts: <strong>{preview?.conflict_count ?? 0}</strong>
            </div>
          </div>
          <DataTable
            value={preview?.rows ?? []}
            dataKey="employee_id"
            paginator
            rows={10}
            size="small"
            stripedRows
            responsiveLayout="scroll"
            emptyMessage="No employees match the selected positions on the reference date."
          >
            <Column field="employee_code" header="Employee" />
            <Column field="employee_name" header="Name" />
            <Column field="position_name" header="Position" />
            <Column
              header="Amount"
              body={(row: PositionAllowancePreview["rows"][number]) =>
                formatCurrency(row.monthly_amount)
              }
            />
            <Column
              header="Result"
              body={(row: PositionAllowancePreview["rows"][number]) => (
                <Tag
                  value={
                    row.eligible
                      ? "Eligible"
                      : row.exclusion_reason
                        ? "Excluded"
                        : "Manual conflict"
                  }
                  severity={row.eligible ? "success" : "warning"}
                />
              )}
            />
          </DataTable>
        </div>
      </Dialog>

      <Dialog
        header="Create New Position Allowance Version"
        visible={versionVisible}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "34rem" }}
        onHide={() => setVersionVisible(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              label="Cancel"
              severity="secondary"
              text
              onClick={() => setVersionVisible(false)}
            />
            <Button
              type="button"
              label="Create Draft"
              icon="pi pi-copy"
              loading={saving}
              onClick={() => void createVersion()}
            />
          </div>
        }
      >
        <div className="grid gap-4 py-2">
          <p className="m-0 text-sm leading-6 text-slate-500">
            The new version copies positions, amounts, and exclusions. Adjust
            the draft before publishing it.
          </p>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Effective From
            <PrimeDatePicker
              value={versionFrom}
              onValueChange={setVersionFrom}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Effective To
            <PrimeDatePicker value={versionTo} onValueChange={setVersionTo} />
          </label>
        </div>
      </Dialog>

      <Dialog
        header="Retire Position Allowance Policy"
        visible={retireVisible}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "34rem" }}
        onHide={() => setRetireVisible(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              label="Cancel"
              severity="secondary"
              text
              onClick={() => setRetireVisible(false)}
            />
            <Button
              type="button"
              label="Retire"
              severity="secondary"
              icon="pi pi-stop-circle"
              loading={saving}
              onClick={() => void retire()}
            />
          </div>
        }
      >
        <div className="grid gap-4 py-2">
          <p className="m-0 text-sm leading-6 text-slate-500">
            Retiring stops the policy from being changed. The end date is
            required so historical payroll can still use the policy without
            leaving an open-ended retired policy.
          </p>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Effective To
            <PrimeDatePicker value={retireTo} onValueChange={setRetireTo} />
          </label>
        </div>
      </Dialog>
    </>
  );
}
