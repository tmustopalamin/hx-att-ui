"use client";
import { useI18n } from "@/app/i18n";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";

import {
  createPayrollComponentMapping,
  deletePayrollComponentMapping,
  updatePayrollComponentMapping,
} from "@/app/services/payroll-configuration-service";
import type {
  PayrollComponentMapping,
  PayrollComponentOption,
  PayrollComponentType,
  SavePayrollComponentMapping,
} from "@/app/types/payroll-configuration";
import { fetcher } from "@/app/utils/fetcher";
import { formatDate as formatDisplayDate } from "@/app/utils/date-format";
import PrimeDatePicker from "@/app/_components/PrimeDatePicker";

interface Props {
  onSuccess: (message: string) => void;
  onError: (error: unknown) => void;
}

const API_URL = "/api/payroll-component-mappings";
const PROGRAMS = [
  "PPH21",
  "BPJS_KESEHATAN",
  "BPJS_TK_JHT",
  "BPJS_TK_JKK",
  "BPJS_TK_JKM",
  "BPJS_TK_JP",
  "BPJS_TK_JKP",
];
const EMPTY_MAPPING: SavePayrollComponentMapping = {
  component_type: "INCOME",
  component_id: 0,
  regulation_program: "PPH21",
  treatment_code: "INCLUDED_IN_BASE",
  is_included: true,
  effective_from: "",
  effective_to: null,
  notes: null,
};

export default function PayrollComponentMappingPanel({
  onSuccess,
  onError,
}: Props) {
  const { t: i18nT } = useI18n();
  const { data, isLoading, isValidating, mutate } = useSWR<
    PayrollComponentMapping[]
  >(API_URL, fetcher);
  const { data: componentMaster } = useSWR<PayrollComponentOption[]>(
    `${API_URL}/options`,
    fetcher,
  );
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<PayrollComponentMapping | null>(
    null,
  );
  const [form, setForm] = useState<SavePayrollComponentMapping>(EMPTY_MAPPING);

  const componentOptions = useMemo(
    () =>
      (componentMaster ?? [])
        .filter((item) => item.component_type === form.component_type)
        .map((item) => ({
          label: i18nT("static.1cx6cam", { p0: item.code, p1: item.name }),
          value: item.component_id,
        })),
    [componentMaster, form.component_type],
  );
  const treatmentOptions = form.regulation_program.startsWith("BPJS_")
    ? ["EMPLOYEE", "EMPLOYER"]
    : ["INCLUDED_IN_BASE", "EXCLUDED_FROM_BASE", "EMPLOYEE_TAX"];

  const close = () => {
    setVisible(false);
    setSelected(null);
    setForm(EMPTY_MAPPING);
  };

  const openNew = () => {
    setSelected(null);
    setForm(EMPTY_MAPPING);
    setVisible(true);
  };

  const openEdit = (row: PayrollComponentMapping) => {
    setSelected(row);
    setForm({
      component_type: row.component_type,
      component_id: row.component_id,
      regulation_program: row.regulation_program,
      treatment_code: row.treatment_code,
      is_included: row.is_included,
      effective_from: row.effective_from,
      effective_to: row.effective_to,
      notes: row.notes,
    });
    setVisible(true);
  };

  const save = async () => {
    if (
      form.component_id <= 0 ||
      !form.regulation_program ||
      !form.treatment_code.trim() ||
      !form.effective_from
    ) {
      onError(new Error("Complete all required mapping fields."));
      return;
    }
    try {
      setSaving(true);
      if (selected) {
        await updatePayrollComponentMapping(
          selected.id,
          selected.row_version,
          form,
        );
      } else {
        await createPayrollComponentMapping(form);
      }
      await mutate();
      close();
      onSuccess(
        selected ? "Component mapping updated." : "Component mapping created.",
      );
    } catch (error: unknown) {
      onError(error);
    } finally {
      setSaving(false);
    }
  };

  const remove = (row: PayrollComponentMapping) => {
    requestActionConfirmation({
      header: i18nT("static.1nabu1c"),
      message: i18nT("static.mghlyp", {
        p0: row.component_code,
        p1: row.regulation_program,
      }),
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: async () => {
        try {
          await deletePayrollComponentMapping(row.id, row.row_version);
          await mutate();
          onSuccess("Component mapping deleted.");
        } catch (error: unknown) {
          onError(error);
        }
      },
    });
  };

  return (
    <div className="flex flex-col gap-4 pt-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          label={i18nT("static.28r6qc")}
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          size="small"
          loading={isValidating}
          onClick={() => void mutate()}
        />
        <Button
          label={i18nT("static.q4o7lz")}
          icon="pi pi-plus"
          size="small"
          onClick={openNew}
        />
      </div>
      <DataTable
        value={data ?? []}
        dataKey="id"
        loading={isLoading}
        paginator
        rows={10}
        stripedRows
        rowHover
        scrollable
        size="small"
        tableStyle={{ minWidth: "72rem" }}
        emptyMessage={i18nT("static.1okp55b")}
      >
        <Column
          field="component_type"
          header={i18nT("static.1m2zofh")}
          sortable
          body={(row: PayrollComponentMapping) => (
            <Tag
              value={row.component_type}
              severity={row.component_type === "INCOME" ? "success" : "warning"}
            />
          )}
        />
        <Column
          field="component_code"
          header={i18nT("static.bvqo3k")}
          sortable
          body={(row: PayrollComponentMapping) => (
            <div>
              <div className="font-mono font-semibold">
                {row.component_code}
              </div>
              <div className="text-xs text-slate-500">{row.component_name}</div>
            </div>
          )}
        />
        <Column
          field="regulation_program"
          header={i18nT("static.1if8prf")}
          sortable
        />
        <Column
          field="treatment_code"
          header={i18nT("static.q1t1gr")}
          sortable
        />
        <Column
          field="is_included"
          header={i18nT("static.1f8pot5")}
          body={(row: PayrollComponentMapping) => (
            <Tag
              value={
                row.is_included
                  ? i18nT("static.1dudzcg")
                  : i18nT("static.r5wqai")
              }
              severity={row.is_included ? "success" : "secondary"}
            />
          )}
        />
        <Column
          field="effective_from"
          header={i18nT("static.ypbwia")}
          sortable
          body={(row: PayrollComponentMapping) =>
            formatDisplayDate(row.effective_from)
          }
        />
        <Column
          field="effective_to"
          header={i18nT("static.mtbgcr")}
          body={(row: PayrollComponentMapping) =>
            formatDisplayDate(row.effective_to, "Open ended")
          }
        />
        <Column
          header={i18nT("static.2wk0tb")}
          frozen
          alignFrozen="right"
          body={(row: PayrollComponentMapping) => (
            <div className="flex justify-end gap-2">
              <Button
                icon="pi pi-pencil"
                aria-label={i18nT("static.k1m607")}
                tooltip={i18nT("static.k1m607")}
                size="small"
                outlined
                onClick={() => openEdit(row)}
              />
              <Button
                icon="pi pi-trash"
                aria-label={i18nT("static.1c66gz4")}
                tooltip={i18nT("static.1c66gz4")}
                size="small"
                severity="danger"
                outlined
                onClick={() => remove(row)}
              />
            </div>
          )}
        />
      </DataTable>

      <Dialog
        header={selected ? i18nT("static.1ps0sv0") : i18nT("static.1w72e58")}
        visible={visible}
        onHide={close}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "42rem" }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label={i18nT("static.ew9em3")}
              severity="secondary"
              text
              disabled={saving}
              onClick={close}
            />
            <Button
              label={
                selected ? i18nT("static.6gmm1l") : i18nT("static.1tpgk3v")
              }
              icon="pi pi-check"
              loading={saving}
              onClick={() => void save()}
            />
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
          <Field label={i18nT("static.1rq7vw6")}>
            <Dropdown
              value={form.component_type}
              options={["INCOME", "DEDUCTION"] satisfies PayrollComponentType[]}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  component_type: event.value as PayrollComponentType,
                  component_id: 0,
                }))
              }
              className="w-full"
            />
          </Field>
          <Field label={i18nT("static.17wjri6")}>
            <Dropdown
              value={form.component_id || null}
              options={componentOptions}
              filter
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  component_id: Number(event.value),
                }))
              }
              className="w-full"
              placeholder={i18nT("static.yrs9f6")}
            />
          </Field>
          <Field label={i18nT("static.v34ctb")}>
            <Dropdown
              value={form.regulation_program}
              options={PROGRAMS}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  regulation_program: String(event.value),
                }))
              }
              className="w-full"
            />
          </Field>
          <Field label={i18nT("static.iiladi")}>
            <Dropdown
              value={form.treatment_code}
              options={treatmentOptions}
              className="w-full"
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  treatment_code: String(event.value),
                }))
              }
            />
          </Field>
          <Field label={i18nT("static.8lx39w")}>
            <PrimeDatePicker
              value={form.effective_from}
              onValueChange={(value) =>
                setForm((current) => ({ ...current, effective_from: value }))
              }
              className="w-full"
            />
          </Field>
          <Field label={i18nT("static.mtbgcr")}>
            <PrimeDatePicker
              value={form.effective_to}
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  effective_to: value || null,
                }))
              }
              className="w-full"
            />
          </Field>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">
              {i18nT("static.57qvzy")}{" "}
            </span>
            <InputSwitch
              checked={form.is_included}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  is_included: Boolean(event.value),
                }))
              }
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
