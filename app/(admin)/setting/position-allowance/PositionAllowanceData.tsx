"use client";
import { useI18n } from "@/app/i18n";
import { formatStatusLabel } from "@/app/i18n/statusLabel";

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
import { isWhitespaceFreeIdentifier } from "@/app/utils/identifier-validation";
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
  const { t: i18nT } = useI18n();
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
          ? i18nT("static.gu0us5", { p0: position.code, p1: position.name })
          : position.name,
        value: position.id,
      })),
    [i18nT, options?.positions],
  );
  const incomeComponentOptions = useMemo(
    () =>
      (options?.income_components ?? []).map((component) => ({
        label: i18nT("static.gu0us5", {
          p0: component.code ?? "-",
          p1: component.name,
        }),
        value: component.id,
      })),
    [i18nT, options?.income_components],
  );
  const employeeOptions = useMemo(
    () =>
      (options?.employees ?? []).map((employee) => ({
        label: i18nT("static.gu0us5", { p0: employee.code, p1: employee.name }),
        value: employee.id,
      })),
    [i18nT, options?.employees],
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
      notify("error", i18nT("static.1yhf46k"), detail);
      return;
    }

    notify(
      "error",
      i18nT("static.1yhf46k"),
      requestError instanceof Error
        ? requestError.message
        : i18nT("static.37lwsc"),
    );
  };

  const ensureOptionsReady = () => {
    if (optionsError) {
      notify("error", i18nT("static.1d8u9ps"), i18nT("static.cuqqju"));
      retryOptions();
      return false;
    }
    if (optionsLoading || !options) {
      notify("error", i18nT("static.1k47w1u"), i18nT("static.1ds799h"));
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
    if (!isWhitespaceFreeIdentifier(form.code)) {
      notify(
        "error",
        i18nT("static.gy1qqi"),
        i18nT("validation.codeNoWhitespace"),
      );
      return null;
    }
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
      notify("error", i18nT("static.gy1qqi"), i18nT("static.15c8y8b"));
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
        i18nT("static.12ek4is"),
        i18nT("static.4ts8le", {
          p0: selected ? i18nT("static.ih4s1f") : i18nT("static.1occrmk"),
        }),
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
        i18nT("static.75k7c9"),
        i18nT("static.4u9575", { p0: policy.code }),
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
      notify("error", i18nT("static.gy1qqi"), i18nT("static.1tkt416"));
      return;
    }
    if (retireTo && retireTo < statusTarget.effective_from) {
      notify("error", i18nT("static.gy1qqi"), i18nT("static.gj7ivi"));
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
      notify(
        "success",
        i18nT("static.j9u73q"),
        i18nT("static.wd1q65", { p0: statusTarget.code }),
      );
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
      notify("error", i18nT("static.gy1qqi"), i18nT("static.eygkk2"));
      return;
    }
    if (versionTo && versionTo < versionFrom) {
      notify("error", i18nT("static.gy1qqi"), i18nT("static.18incb9"));
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
      notify("success", i18nT("static.1q6bb20"), i18nT("static.muz8wr"));
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
                  {i18nT("static.1yhf46k")}{" "}
                </h1>
                <p className="m-0 mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                  {i18nT("static.115aopx")}{" "}
                </p>
              </div>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button
                type="button"
                label={i18nT("static.28r6qc")}
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
                  label={i18nT("static.19n8kxx")}
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
                    ? i18nT("static.1x68gel")
                    : i18nT("static.123j8cz")}
                </span>
              </div>
              {optionsError && (
                <Button
                  type="button"
                  label={i18nT("static.142vlfj")}
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
            <span className="font-medium">{i18nT("static.14bk28f")}</span>
            <Tag value={i18nT("static.12xppws")} severity="warning" />
            <span>{i18nT("static.142kvve")}</span>
            <Tag value={i18nT("static.1drx2ll")} severity="success" />
            <span>{i18nT("static.142kvve")}</span>
            <Tag value={i18nT("static.1anjv92")} severity="secondary" />
            <label className="ml-auto flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeAll}
                onChange={(event) => setIncludeAll(event.target.checked)}
              />
              {i18nT("static.1rg79f8")}{" "}
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
            emptyMessage={i18nT("static.10br7l7")}
          >
            <Column field="code" header={i18nT("static.xoaiok")} sortable />
            <Column
              field="version_no"
              header={i18nT("static.q0zd4n")}
              sortable
            />
            <Column field="name" header={i18nT("static.1g6zau7")} sortable />
            <Column
              header={i18nT("static.y9fzfn")}
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
              header={i18nT("static.14pnb2x")}
              body={(row: PositionAllowancePolicy) =>
                row.income_component_code
                  ? `${row.income_component_code} — ${row.income_component_name}`
                  : row.income_component_name
              }
              style={{ minWidth: "18rem" }}
            />
            <Column
              header={i18nT("static.1lr4ql4")}
              body={(row: PositionAllowancePolicy) => row.exclusions.length}
            />
            <Column
              header={i18nT("static.1r1sas2")}
              body={(row: PositionAllowancePolicy) =>
                `${row.effective_from} — ${row.effective_to ?? "Open"}`
              }
            />
            <Column
              header={i18nT("static.3pd73")}
              body={(row: PositionAllowancePolicy) => (
                <Tag
                  value={i18nT(formatStatusLabel(row.status))}
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
                header={i18nT("static.2wk0tb")}
                body={(row: PositionAllowancePolicy) => (
                  <div className="flex flex-wrap gap-2">
                    {row.status === "DRAFT" && (
                      <>
                        <Button
                          type="button"
                          label={i18nT("static.1i1lcq9")}
                          icon="pi pi-pencil"
                          outlined
                          size="small"
                          onClick={() => openEdit(row)}
                        />
                        <Button
                          type="button"
                          label={i18nT("static.u2m17s")}
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
                        label={i18nT("static.1hjynst")}
                        icon="pi pi-copy"
                        outlined
                        size="small"
                        onClick={() => openVersion(row)}
                      />
                    )}
                    {row.status === "PUBLISHED" && (
                      <Button
                        type="button"
                        label={i18nT("static.rgquxi")}
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
        header={selected ? i18nT("static.i3lkqt") : i18nT("static.nwcujm")}
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
              label={i18nT("static.d4sj7i")}
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
                label={i18nT("static.ew9em3")}
                severity="secondary"
                text
                onClick={closeEditor}
              />
              <Button
                type="button"
                label={i18nT("static.1mxlpez")}
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
              <span>{i18nT("static.1y6zqfb")} </span>
              {optionsError && (
                <Button
                  type="button"
                  label={i18nT("static.zkouah")}
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
              {i18nT("static.yyofws")}{" "}
              <InputText
                value={form.code}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    code: event.target.value,
                  }))
                }
                placeholder={i18nT("static.t3fuub")}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {i18nT("static.c1t4lq")}{" "}
              <InputText
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder={i18nT("static.1524haj")}
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.1p2qmo")}{" "}
            <Dropdown
              value={form.income_component_id}
              options={incomeComponentOptions}
              filter
              className="w-full"
              placeholder={i18nT("static.49tvxd")}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  income_component_id: (event.value as number | null) ?? null,
                }))
              }
            />
            <span className="text-xs font-normal text-slate-500">
              {i18nT("static.5ontda")}{" "}
            </span>
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.io9v8g")}{" "}
            <MultiSelect
              value={form.positions.map((position) => position.position_id)}
              options={positionOptions}
              filter
              display="chip"
              className="w-full"
              placeholder={i18nT("static.9isl27")}
              onChange={(event) =>
                updateSelectedPositions((event.value as number[]) ?? [])
              }
            />
          </label>

          {form.positions.length > 0 && (
            <div className="grid gap-2 rounded-lg border border-slate-200 p-3">
              <div className="text-sm font-semibold text-slate-700">
                {i18nT("static.zdl2qg")}{" "}
              </div>
              {form.positions.map((position, index) => {
                const option = options?.positions?.find(
                  (item) => item.id === position.position_id,
                );
                return (
                  <div
                    className="grid items-center gap-3 md:grid-cols-[1fr_15rem]"
                    key={position.position_id}
                  >
                    <span className="text-sm text-slate-600">
                      {option?.code
                        ? i18nT("static.gu0us5", {
                            p0: option.code,
                            p1: option.name,
                          })
                        : (option?.name ?? position.position_id)}
                    </span>
                    <InputNumber
                      value={position.monthly_amount}
                      mode="currency"
                      currency="IDR"
                      locale="id-ID"
                      min={0}
                      className="w-full"
                      placeholder={i18nT("static.1dhwgef")}
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
              {i18nT("static.ypbwia")}{" "}
              <PrimeDatePicker
                value={form.effective_from}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, effective_from: value }))
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {i18nT("static.mtbgcr")}{" "}
              <PrimeDatePicker
                value={form.effective_to}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, effective_to: value }))
                }
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.1tu0cy9")}{" "}
            <MultiSelect
              value={form.exclusions.map((exclusion) => exclusion.employee_id)}
              options={employeeOptions}
              filter
              display="chip"
              className="w-full"
              placeholder={i18nT("static.11xsfa8")}
              onChange={(event) =>
                updateSelectedExclusions((event.value as number[]) ?? [])
              }
            />
          </label>

          {form.exclusions.length > 0 && (
            <div className="grid gap-2 rounded-lg border border-amber-200 bg-amber-50/40 p-3">
              <div className="text-sm font-semibold text-slate-700">
                {i18nT("static.1yfgx5q")}{" "}
              </div>
              {form.exclusions.map((exclusion, index) => {
                const option = options?.employees?.find(
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
                      placeholder={i18nT("static.1oqha3e")}
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
            {i18nT("static.1xv25wt")}{" "}
          </p>
        </div>
      </Dialog>

      <Dialog
        header={i18nT("static.c44x7l")}
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
              {i18nT("static.1avtau6")}{" "}
              <strong>{preview?.eligible_count ?? 0}</strong>
            </div>
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              {i18nT("static.sl3cwn")}{" "}
              <strong>{preview?.excluded_count ?? 0}</strong>
            </div>
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
              {i18nT("static.l1bghi")}{" "}
              <strong>{preview?.conflict_count ?? 0}</strong>
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
            emptyMessage={i18nT("static.1wgpnm3")}
          >
            <Column field="employee_code" header={i18nT("static.1fak8xt")} />
            <Column field="employee_name" header={i18nT("static.4el6o6")} />
            <Column field="position_name" header={i18nT("static.1quewx6")} />
            <Column
              header={i18nT("static.a2ky21")}
              body={(row: PositionAllowancePreview["rows"][number]) =>
                formatCurrency(row.monthly_amount)
              }
            />
            <Column
              header={i18nT("static.ma0s3o")}
              body={(row: PositionAllowancePreview["rows"][number]) => (
                <Tag
                  value={
                    row.eligible
                      ? i18nT("static.ile4gg")
                      : row.exclusion_reason
                        ? i18nT("static.tio6hj")
                        : i18nT("static.1f81jxn")
                  }
                  severity={row.eligible ? "success" : "warning"}
                />
              )}
            />
          </DataTable>
        </div>
      </Dialog>

      <Dialog
        header={i18nT("static.17nhwl4")}
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
              label={i18nT("static.ew9em3")}
              severity="secondary"
              text
              onClick={() => setVersionVisible(false)}
            />
            <Button
              type="button"
              label={i18nT("static.4tz1ya")}
              icon="pi pi-copy"
              loading={saving}
              onClick={() => void createVersion()}
            />
          </div>
        }
      >
        <div className="grid gap-4 py-2">
          <p className="m-0 text-sm leading-6 text-slate-500">
            {i18nT("static.1wh38am")}{" "}
          </p>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.ypbwia")}{" "}
            <PrimeDatePicker
              value={versionFrom}
              onValueChange={setVersionFrom}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.mtbgcr")}{" "}
            <PrimeDatePicker value={versionTo} onValueChange={setVersionTo} />
          </label>
        </div>
      </Dialog>

      <Dialog
        header={i18nT("static.zi9hcb")}
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
              label={i18nT("static.ew9em3")}
              severity="secondary"
              text
              onClick={() => setRetireVisible(false)}
            />
            <Button
              type="button"
              label={i18nT("static.rgquxi")}
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
            {i18nT("static.zuzwuf")}{" "}
          </p>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.mtbgcr")}{" "}
            <PrimeDatePicker value={retireTo} onValueChange={setRetireTo} />
          </label>
        </div>
      </Dialog>
    </>
  );
}
