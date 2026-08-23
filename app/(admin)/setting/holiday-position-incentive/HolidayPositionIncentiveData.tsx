"use client";
import { useI18n } from "@/app/i18n";

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
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { MultiSelect } from "primereact/multiselect";
import { Tag } from "primereact/tag";

import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import PrimeDatePicker from "@/app/_components/PrimeDatePicker";
import {
  createHolidayPositionIncentivePolicy,
  getHolidayPositionIncentivePolicies,
  updateHolidayPositionIncentivePolicy,
} from "@/app/services/holiday-position-incentive-service";
import type { IncomeComponent } from "@/app/types/income-component";
import type {
  HolidayPositionIncentivePolicy,
  HolidayPositionIncentivePolicyPayload,
} from "@/app/types/holiday-position-incentive";
import type { Position } from "@/app/types/position";
import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { fetcher } from "@/app/utils/fetcher";
import type { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";

type PolicyForm = {
  code: string;
  name: string;
  income_component_id: number | null;
  daily_amount: number | null;
  effective_from: string;
  effective_to: string;
  is_active: boolean;
  position_ids: number[];
};

const emptyForm = (): PolicyForm => ({
  code: "",
  name: "",
  income_component_id: null,
  daily_amount: null,
  effective_from: "",
  effective_to: "",
  is_active: true,
  position_ids: [],
});

const formatCurrency = (value: string | number) => {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(amount)
    : "-";
};

export default function HolidayPositionIncentiveData() {
  const { t: i18nT } = useI18n();
  const dispatch = useDispatch();
  const permissions = useSelector(
    (state: RootState) => state.profile.permissions,
  );
  const canManage = permissions.includes("payroll-config.manage");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [selected, setSelected] =
    useState<HolidayPositionIncentivePolicy | null>(null);
  const [form, setForm] = useState<PolicyForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const listKey = `holiday-position-incentive-policies-${includeInactive}`;

  const {
    data: policies,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<HolidayPositionIncentivePolicy[]>(listKey, () =>
    getHolidayPositionIncentivePolicies(includeInactive),
  );
  const { data: positions = [] } = useSWR<Position[]>(
    canManage ? "/api/position?show_all=false" : null,
    fetcher,
  );
  const { data: incomeComponents = [] } = useSWR<IncomeComponent[]>(
    canManage ? "/api/income-component?show_all=false" : null,
    fetcher,
  );

  const positionOptions = useMemo(
    () =>
      positions
        .filter((position) => position.is_active && !position.deleted_at)
        .map((position) => ({
          label: position.code
            ? i18nT("static.1v0umq8", { p0: position.code, p1: position.name })
            : position.name,
          value: position.id,
        })),
    [positions],
  );
  const incomeOptions = useMemo(
    () =>
      incomeComponents
        .filter(
          (component) =>
            component.is_active &&
            !component.deleted_at &&
            component.assignment_mode === "EMPLOYEE",
        )
        .map((component) => ({
          label: i18nT("static.1v0umq8", {
            p0: component.code ?? "-",
            p1: component.name,
          }),
          value: component.id,
        })),
    [incomeComponents],
  );

  const notify = (
    severity: "success" | "error",
    summary: string,
    detail: string,
  ) => {
    dispatch(showToast({ visible: true, severity, summary, detail }));
  };

  const showError = (requestError: unknown) => {
    notify(
      "error",
      i18nT("static.rulhkg"),
      isResponseTypeError(requestError)
        ? getErrorMessage(requestError, "message")
        : requestError instanceof Error
          ? requestError.message
          : i18nT("static.37lwsc"),
    );
  };

  const closeDialog = () => {
    setDialogVisible(false);
    setSelected(null);
    setForm(emptyForm());
  };

  const openNew = () => {
    setSelected(null);
    setForm(emptyForm());
    setDialogVisible(true);
  };

  const openEdit = (policy: HolidayPositionIncentivePolicy) => {
    setSelected(policy);
    setForm({
      code: policy.code,
      name: policy.name,
      income_component_id: policy.income_component_id,
      daily_amount: Number(policy.daily_amount),
      effective_from: policy.effective_from,
      effective_to: policy.effective_to ?? "",
      is_active: policy.is_active,
      position_ids: policy.positions.map((position) => position.id),
    });
    setDialogVisible(true);
  };

  const save = async () => {
    const code = form.code.trim().toUpperCase();
    const name = form.name.trim();
    if (
      !code ||
      !name ||
      !form.income_component_id ||
      !form.daily_amount ||
      form.daily_amount <= 0 ||
      !form.effective_from ||
      (form.effective_to && form.effective_to < form.effective_from) ||
      form.position_ids.length === 0
    ) {
      notify("error", i18nT("static.gy1qqi"), i18nT("static.1f8yofc"));
      return;
    }
    const payload: HolidayPositionIncentivePolicyPayload = {
      code,
      name,
      income_component_id: form.income_component_id,
      daily_amount: form.daily_amount,
      effective_from: form.effective_from,
      effective_to: form.effective_to || null,
      is_active: form.is_active,
      position_ids: form.position_ids,
    };
    setSaving(true);
    try {
      if (selected) {
        await updateHolidayPositionIncentivePolicy(
          selected.id,
          selected.row_version,
          payload,
        );
      } else {
        await createHolidayPositionIncentivePolicy(payload);
      }
      await mutate();
      closeDialog();
      notify(
        "success",
        i18nT("static.12ek4is"),
        i18nT("static.14zkfct", {
          p0: selected ? i18nT("static.90vcj4") : i18nT("static.dupnej"),
        }),
      );
    } catch (requestError) {
      showError(requestError);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <LoadingDataTable />;
  if (error) return <ErrorNotConnectedToApi mutateKey={listKey} />;

  return (
    <>
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:flex">
                <i className="pi pi-calendar-plus text-xl" />
              </div>
              <div>
                <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
                  {i18nT("static.1j8t3bn")}{" "}
                </h1>
                <p className="m-0 mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                  {i18nT("static.1j4jfku")}{" "}
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
                  onClick={openNew}
                />
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-600">
            <InputSwitch
              checked={includeInactive}
              onChange={(event) => setIncludeInactive(Boolean(event.value))}
            />
            {i18nT("static.a23f7x")}{" "}
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
            tableStyle={{ minWidth: "68rem" }}
            emptyMessage={i18nT("static.5s9jqo")}
          >
            <Column field="code" header={i18nT("static.xoaiok")} sortable />
            <Column field="name" header={i18nT("static.1g6zau7")} sortable />
            <Column
              header={i18nT("static.1s5v9qz")}
              body={(row: HolidayPositionIncentivePolicy) =>
                row.positions.map((position) => position.name).join(", ")
              }
              style={{ minWidth: "18rem" }}
            />
            <Column
              header={i18nT("static.14pnb2x")}
              body={(row: HolidayPositionIncentivePolicy) =>
                row.income_component_code
                  ? `${row.income_component_code} — ${row.income_component_name}`
                  : row.income_component_name
              }
              style={{ minWidth: "18rem" }}
            />
            <Column
              header={i18nT("static.18m2ufq")}
              body={(row: HolidayPositionIncentivePolicy) =>
                formatCurrency(row.daily_amount)
              }
            />
            <Column
              header={i18nT("static.1r1sas2")}
              body={(row: HolidayPositionIncentivePolicy) =>
                `${row.effective_from} — ${row.effective_to ?? "Open"}`
              }
            />
            <Column
              header={i18nT("static.3pd73")}
              body={(row: HolidayPositionIncentivePolicy) => (
                <Tag
                  value={
                    row.is_active
                      ? i18nT("static.8qzyhb")
                      : i18nT("static.13zf5vc")
                  }
                  severity={row.is_active ? "success" : "warning"}
                />
              )}
            />
            {canManage && (
              <Column
                header={i18nT("static.2wk0tb")}
                body={(row: HolidayPositionIncentivePolicy) => (
                  <Button
                    type="button"
                    label={i18nT("static.1i1lcq9")}
                    icon="pi pi-pencil"
                    outlined
                    size="small"
                    onClick={() => openEdit(row)}
                  />
                )}
              />
            )}
          </DataTable>
        </div>
      </Card>

      <Dialog
        header={selected ? i18nT("static.l7of6l") : i18nT("static.1nwqo65")}
        visible={dialogVisible}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "52rem" }}
        onHide={closeDialog}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              label={i18nT("static.ew9em3")}
              severity="secondary"
              text
              onClick={closeDialog}
            />
            <Button
              type="button"
              label={i18nT("static.lewgh4")}
              icon="pi pi-check"
              loading={saving}
              onClick={() => void save()}
            />
          </div>
        }
      >
        <div className="grid gap-4 py-2">
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
                placeholder={i18nT("static.1fwiiy3")}
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
                placeholder={i18nT("static.1j8t3bn")}
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.io9v8g")}{" "}
            <MultiSelect
              value={form.position_ids}
              options={positionOptions}
              filter
              display="chip"
              className="w-full"
              placeholder={i18nT("static.9isl27")}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  position_ids: (event.value as number[]) ?? [],
                }))
              }
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {i18nT("static.14pnb2x")}{" "}
              <Dropdown
                value={form.income_component_id}
                options={incomeOptions}
                filter
                className="w-full"
                placeholder={i18nT("static.nccmmq")}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    income_component_id: (event.value as number | null) ?? null,
                  }))
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {i18nT("static.va0bu3")}{" "}
              <InputNumber
                value={form.daily_amount}
                mode="currency"
                currency="IDR"
                locale="id-ID"
                min={0}
                className="w-full"
                onValueChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    daily_amount: event.value ?? null,
                  }))
                }
              />
            </label>
          </div>
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
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <InputSwitch
              checked={form.is_active}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  is_active: Boolean(event.value),
                }))
              }
            />
            {i18nT("static.1wicliv")}{" "}
          </label>
          <p className="m-0 text-xs leading-5 text-slate-500">
            {i18nT("static.1iqxkm8")}{" "}
          </p>
        </div>
      </Dialog>
    </>
  );
}
