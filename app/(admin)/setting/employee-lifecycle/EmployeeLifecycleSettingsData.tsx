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
import { InputTextarea } from "primereact/inputtextarea";
import { Tag } from "primereact/tag";

import { showToast } from "@/store/ToastSlice";
import type { RootState } from "@/store/store";
import { fetcher } from "@/app/utils/fetcher";
import {
  createEmployeeLifecycleTemplateVersion,
  getEmployeeLifecycleAssignees,
  setEmployeeLifecycleTemplateActive,
} from "@/app/services/employee-lifecycle-settings-service";
import type { ResponseType } from "@/app/types/response-type";
import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { formatDate as formatDisplayDate } from "@/app/utils/date-format";
import type {
  EmployeeLifecycleAssigneeOption,
  EmployeeLifecycleChecklistItemInput,
  EmployeeLifecycleChecklistTemplateInput,
  EmployeeLifecycleChecklistTemplateSetting,
  EmployeeLifecycleSettings,
  LifecycleAssignmentSource,
} from "@/app/types/employee-lifecycle-settings";
import PrimeDatePicker from "@/app/_components/PrimeDatePicker";

const typeOptions: {
  labelKey: string;
  value: EmployeeLifecycleChecklistTemplateInput["lifecycle_type"];
}[] = [
  { labelKey: "Onboarding", value: "ONBOARDING" },
  { labelKey: "Employment Change", value: "EMPLOYMENT_CHANGE" },
  { labelKey: "Offboarding", value: "OFFBOARDING" },
];

const sourceOptions: { labelKey: string; value: LifecycleAssignmentSource }[] =
  [
    { labelKey: "Employee", value: "EMPLOYEE" },
    { labelKey: "Supervisor / Manager", value: "SUPERVISOR" },
    { labelKey: "Existing Role", value: "ROLE" },
    { labelKey: "Manual Assignment", value: "MANUAL" },
  ];

const emptyItem = (): EmployeeLifecycleChecklistItemInput => ({
  code: "",
  name: "",
  description: null,
  sequence_no: 10,
  is_required: true,
  owner_scope: "ROLE",
  assignment_source: "MANUAL",
  assignment_role_code: null,
  primary_assignee_employee_id: null,
  due_offset_days: null,
  reminder_days_before: null,
  notify_on_activation: true,
  is_active: true,
});

const emptyTemplate = (): EmployeeLifecycleChecklistTemplateInput => ({
  lifecycle_type: "ONBOARDING",
  code: "STANDARD_ONBOARDING",
  name: "Standard Onboarding",
  description: null,
  effective_from: new Date().toISOString().slice(0, 10),
  effective_to: null,
  is_active: true,
  items: [emptyItem()],
});

const cloneTemplate = (
  template: EmployeeLifecycleChecklistTemplateSetting,
): EmployeeLifecycleChecklistTemplateInput => ({
  lifecycle_type: template.lifecycle_type,
  code: template.code,
  name: template.name,
  description: template.description,
  effective_from: new Date().toISOString().slice(0, 10),
  effective_to: null,
  is_active: true,
  items: template.items.map((item) => ({
    code: item.code,
    name: item.name,
    description: item.description,
    sequence_no: item.sequence_no,
    is_required: item.is_required,
    owner_scope: item.owner_scope,
    assignment_source: item.assignment_source,
    assignment_role_code: item.assignment_role_code,
    primary_assignee_employee_id: item.primary_assignee_employee_id,
    due_offset_days: item.due_offset_days,
    reminder_days_before: item.reminder_days_before,
    notify_on_activation: item.notify_on_activation,
    is_active: item.is_active,
  })),
});

const formatDate = (value: string | null) => formatDisplayDate(value);

export default function EmployeeLifecycleSettingsData() {
  const { t: i18nT } = useI18n();
  const dispatch = useDispatch();
  const permissions = useSelector(
    (state: RootState) => state.profile.permissions,
  );
  const canManage = permissions.includes("employee-lifecycle.settings.manage");
  const settingsKey = "/api/employee-lifecycle/settings";
  const { data, error, isLoading, mutate } = useSWR<
    ResponseType<EmployeeLifecycleSettings>
  >(settingsKey, fetcher);
  const { data: assigneeData } = useSWR<
    ResponseType<EmployeeLifecycleAssigneeOption[]>
  >(`${settingsKey}/assignees`, fetcher);
  const settings = data?.data;
  const assignees = assigneeData?.data ?? [];
  const roleOptions = useMemo(() => {
    const roles = new Set(["hr", "payroll-maker"]);
    assignees.forEach((item) => roles.add(item.role_code));
    return Array.from(roles)
      .sort()
      .map((value) => ({ label: value, value }));
  }, [assignees]);

  const [templateDialog, setTemplateDialog] = useState(false);
  const [itemDialog, setItemDialog] = useState(false);
  const [draft, setDraft] =
    useState<EmployeeLifecycleChecklistTemplateInput>(emptyTemplate);
  const [itemDraft, setItemDraft] =
    useState<EmployeeLifecycleChecklistItemInput>(emptyItem);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const notify = (severity: "success" | "error", detail: string) =>
    dispatch(
      showToast({
        visible: true,
        severity,
        summary:
          severity === "success"
            ? i18nT("static.udvru8")
            : i18nT("static.1vks92p"),
        detail,
      }),
    );

  const openNewTemplate = (
    template?: EmployeeLifecycleChecklistTemplateSetting,
  ) => {
    setDraft(template ? cloneTemplate(template) : emptyTemplate());
    setTemplateDialog(true);
  };

  const openNewItem = () => {
    setEditingItemIndex(null);
    setItemDraft({
      ...emptyItem(),
      sequence_no:
        (Math.max(0, ...draft.items.map((item) => item.sequence_no)) || 0) + 10,
    });
    setItemDialog(true);
  };

  const openEditItem = (
    item: EmployeeLifecycleChecklistItemInput,
    index: number,
  ) => {
    setEditingItemIndex(index);
    setItemDraft({ ...item });
    setItemDialog(true);
  };

  const saveItem = () => {
    if (!itemDraft.code.trim() || !itemDraft.name.trim()) {
      notify("error", i18nT("static.1yphguc"));
      return;
    }
    if (
      itemDraft.assignment_source === "ROLE" &&
      !itemDraft.assignment_role_code
    ) {
      notify("error", i18nT("static.op3h0g"));
      return;
    }
    const normalizedItem: EmployeeLifecycleChecklistItemInput =
      itemDraft.assignment_source === "ROLE"
        ? {
            ...itemDraft,
            assignment_role_code:
              itemDraft.assignment_role_code?.trim() || null,
          }
        : {
            ...itemDraft,
            assignment_role_code: null,
            primary_assignee_employee_id: null,
          };
    setDraft((current) => {
      const items = [...current.items];
      if (editingItemIndex === null) items.push(normalizedItem);
      else items[editingItemIndex] = normalizedItem;
      return { ...current, items };
    });
    setItemDialog(false);
  };

  const removeItem = (index: number) => {
    setDraft((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const saveTemplate = async () => {
    if (!draft.code.trim() || !draft.name.trim() || draft.items.length === 0) {
      notify("error", i18nT("static.j7vx3u"));
      return;
    }
    setSaving(true);
    try {
      await createEmployeeLifecycleTemplateVersion({
        ...draft,
        code: draft.code.trim(),
        name: draft.name.trim(),
      });
      setTemplateDialog(false);
      await mutate();
      notify("success", i18nT("static.1e15m2j"));
    } catch (caught: unknown) {
      notify(
        "error",
        isResponseTypeError(caught)
          ? getErrorMessage(caught, "message")
          : caught instanceof Error
            ? caught.message
            : i18nT("static.1sennu8"),
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleTemplate = async (
    template: EmployeeLifecycleChecklistTemplateSetting,
  ) => {
    setSaving(true);
    try {
      await setEmployeeLifecycleTemplateActive(
        template.id,
        template.row_version,
        !template.is_active,
      );
      await mutate();
      notify("success", i18nT("static.1lnj0qu"));
    } catch (caught: unknown) {
      notify(
        "error",
        isResponseTypeError(caught)
          ? getErrorMessage(caught, "message")
          : i18nT("static.1y9o6sa"),
      );
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <Card className="border border-red-200">
        <p className="m-0 text-sm text-red-600">{i18nT("static.193pf8h")} </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-4 p-3 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="m-0 text-xl font-semibold text-slate-800 sm:text-2xl">
              {i18nT("static.qa7z2n")}{" "}
            </h1>
            <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
              {i18nT("static.dcx3dr")}{" "}
            </p>
          </div>
          {canManage && (
            <Button
              label={i18nT("static.18a68vx")}
              icon="pi pi-plus"
              size="small"
              onClick={() => openNewTemplate()}
            />
          )}
        </div>
      </Card>

      <Card
        title={i18nT("static.tsjm4y")}
        className="border border-slate-200 shadow-sm"
      >
        <DataTable
          value={settings?.types ?? []}
          loading={isLoading}
          size="small"
          stripedRows
        >
          <Column field="name" header={i18nT("static.1cozql1")} />
          <Column field="lifecycle_type" header={i18nT("static.xoaiok")} />
          <Column
            field="description"
            header={i18nT("static.sjj37t")}
            body={(row) => row.description || "-"}
          />
          <Column
            header={i18nT("static.3pd73")}
            body={(row) => (
              <Tag
                value={
                  row.is_active
                    ? i18nT("static.dokrfz")
                    : i18nT("static.dt0j4o")
                }
                severity={row.is_active ? "success" : "secondary"}
              />
            )}
          />
        </DataTable>
      </Card>

      <Card
        title={i18nT("static.ic24fk")}
        className="border border-slate-200 shadow-sm"
      >
        <DataTable
          value={settings?.templates ?? []}
          loading={isLoading}
          dataKey="id"
          size="small"
          stripedRows
          rowHover
          emptyMessage={i18nT("static.cdz91i")}
        >
          <Column field="lifecycle_type" header={i18nT("static.1m2zofh")} />
          <Column field="code" header={i18nT("static.xoaiok")} />
          <Column field="name" header={i18nT("static.4el6o6")} />
          <Column field="version_no" header={i18nT("static.q0zd4n")} />
          <Column
            header={i18nT("static.1r1sas2")}
            body={(row) =>
              `${formatDate(row.effective_from)} - ${formatDate(row.effective_to)}`
            }
          />
          <Column
            header={i18nT("static.fzjmnh")}
            body={(row) => row.items.length}
          />
          <Column
            header={i18nT("static.3pd73")}
            body={(row) => (
              <Tag
                value={
                  row.is_active
                    ? i18nT("static.dokrfz")
                    : i18nT("static.dt0j4o")
                }
                severity={row.is_active ? "success" : "secondary"}
              />
            )}
          />
          <Column
            header={i18nT("static.2wk0tb")}
            body={(row: EmployeeLifecycleChecklistTemplateSetting) => (
              <div className="flex justify-end gap-1">
                {canManage && (
                  <>
                    <Button
                      icon="pi pi-copy"
                      text
                      rounded
                      aria-label={i18nT("static.n7wr4t")}
                      tooltip={i18nT("static.n7wr4t")}
                      onClick={() => openNewTemplate(row)}
                    />
                    <Button
                      icon={row.is_active ? "pi pi-pause" : "pi pi-play"}
                      text
                      rounded
                      severity={row.is_active ? "warning" : "success"}
                      aria-label={
                        row.is_active
                          ? i18nT("static.zgo73n")
                          : i18nT("static.giwx3k")
                      }
                      tooltip={
                        row.is_active
                          ? i18nT("static.zgo73n")
                          : i18nT("static.giwx3k")
                      }
                      disabled={saving}
                      onClick={() => void toggleTemplate(row)}
                    />
                  </>
                )}
              </div>
            )}
          />
        </DataTable>
      </Card>

      <Dialog
        header={i18nT("static.vaftc9")}
        visible={templateDialog}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "96vw", maxWidth: "72rem" }}
        onHide={() => !saving && setTemplateDialog(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label={i18nT("static.ew9em3")}
              text
              severity="secondary"
              disabled={saving}
              onClick={() => setTemplateDialog(false)}
            />
            <Button
              label={i18nT("static.1851gbo")}
              icon="pi pi-check"
              loading={saving}
              onClick={() => void saveTemplate()}
            />
          </div>
        }
      >
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {i18nT("static.1cozql1")}{" "}
              <Dropdown
                value={draft.lifecycle_type}
                options={typeOptions.map((option) => ({
                  label: i18nT(option.labelKey),
                  value: option.value,
                }))}
                className="w-full"
                onChange={(event) =>
                  setDraft({ ...draft, lifecycle_type: event.value })
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {i18nT("static.1jff9a0")}{" "}
              <InputText
                value={draft.code}
                className="w-full"
                onChange={(event) =>
                  setDraft({ ...draft, code: event.target.value })
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {i18nT("static.12sfbca")}{" "}
              <InputText
                value={draft.name}
                className="w-full"
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {i18nT("static.ypbwia")}{" "}
              <PrimeDatePicker
                value={draft.effective_from}
                className="w-full"
                onValueChange={(value) =>
                  setDraft({ ...draft, effective_from: value })
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {i18nT("static.mtbgcr")}{" "}
              <span className="font-normal text-slate-400">
                {i18nT("static.6pi6gi")}
              </span>
              <PrimeDatePicker
                value={draft.effective_to}
                className="w-full"
                onValueChange={(value) =>
                  setDraft({ ...draft, effective_to: value || null })
                }
              />
            </label>
            <label className="flex items-center gap-3 pt-7 text-sm font-medium text-slate-700">
              {i18nT("static.1mtvhqf")}{" "}
              <InputSwitch
                checked={draft.is_active}
                onChange={(event) =>
                  setDraft({ ...draft, is_active: event.value })
                }
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.sjj37t")}{" "}
            <InputTextarea
              value={draft.description ?? ""}
              rows={2}
              autoResize
              onChange={(event) =>
                setDraft({ ...draft, description: event.target.value || null })
              }
            />
          </label>
          <div className="rounded-lg border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
              <span className="text-sm font-semibold text-slate-700">
                {i18nT("static.1suo1ef")}{" "}
              </span>
              <Button
                label={i18nT("static.z83ert")}
                icon="pi pi-plus"
                size="small"
                outlined
                onClick={openNewItem}
              />
            </div>
            <DataTable
              value={[...draft.items].sort(
                (a, b) => a.sequence_no - b.sequence_no,
              )}
              size="small"
              emptyMessage={i18nT("static.708fc9")}
            >
              <Column field="sequence_no" header="#" />
              <Column field="name" header={i18nT("static.x0051o")} />
              <Column
                field="assignment_source"
                header={i18nT("static.q3tmuu")}
              />
              <Column
                header={i18nT("static.1402mgp")}
                body={(row) => row.assignment_role_code || "-"}
              />
              <Column
                header={i18nT("static.mq0cow")}
                body={(row) => (row.is_required ? "Yes" : "No")}
              />
              <Column
                header={i18nT("static.lfawnp")}
                body={(row) =>
                  row.due_offset_days === null
                    ? "-"
                    : `+${row.due_offset_days} days`
                }
              />
              <Column
                header={i18nT("static.3pd73")}
                body={(row) => (
                  <Tag
                    value={
                      row.is_active
                        ? i18nT("static.dokrfz")
                        : i18nT("static.dt0j4o")
                    }
                    severity={row.is_active ? "success" : "secondary"}
                  />
                )}
              />
              <Column
                header={i18nT("static.2wk0tb")}
                body={(row: EmployeeLifecycleChecklistItemInput) => {
                  const index = draft.items.indexOf(row);
                  return (
                    <div className="flex justify-end gap-1">
                      <Button
                        icon="pi pi-pencil"
                        text
                        rounded
                        aria-label={i18nT("static.at0yqq")}
                        tooltip={i18nT("static.at0yqq")}
                        onClick={() => openEditItem(row, index)}
                      />
                      <Button
                        icon="pi pi-trash"
                        text
                        rounded
                        severity="danger"
                        aria-label={i18nT("static.myktnn")}
                        tooltip={i18nT("static.myktnn")}
                        onClick={() => removeItem(index)}
                      />
                    </div>
                  );
                }}
              />
            </DataTable>
          </div>
        </div>
      </Dialog>

      <Dialog
        header={
          editingItemIndex === null
            ? i18nT("static.1dkmwc1")
            : i18nT("static.183knbm")
        }
        visible={itemDialog}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "42rem" }}
        onHide={() => setItemDialog(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label={i18nT("static.ew9em3")}
              text
              severity="secondary"
              onClick={() => setItemDialog(false)}
            />
            <Button
              label={i18nT("static.7t7ri5")}
              icon="pi pi-check"
              onClick={saveItem}
            />
          </div>
        }
      >
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {i18nT("static.v9enxt")}{" "}
              <InputText
                value={itemDraft.code}
                onChange={(event) =>
                  setItemDraft({ ...itemDraft, code: event.target.value })
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {i18nT("static.184t3j3")}{" "}
              <InputText
                value={itemDraft.name}
                onChange={(event) =>
                  setItemDraft({ ...itemDraft, name: event.target.value })
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {i18nT("static.ryxthk")}{" "}
              <InputNumber
                value={itemDraft.sequence_no}
                min={1}
                onValueChange={(event) =>
                  setItemDraft({ ...itemDraft, sequence_no: event.value ?? 1 })
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {i18nT("static.1at1efp")}{" "}
              <Dropdown
                value={itemDraft.assignment_source}
                options={sourceOptions.map((option) => ({
                  label: i18nT(option.labelKey),
                  value: option.value,
                }))}
                className="w-full"
                onChange={(event) =>
                  setItemDraft({
                    ...itemDraft,
                    assignment_source: event.value,
                    assignment_role_code:
                      event.value === "ROLE"
                        ? itemDraft.assignment_role_code
                        : null,
                    primary_assignee_employee_id:
                      event.value === "ROLE"
                        ? itemDraft.primary_assignee_employee_id
                        : null,
                  })
                }
              />
            </label>
            {itemDraft.assignment_source === "ROLE" && (
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                {i18nT("static.1402mgp")}{" "}
                <Dropdown
                  value={itemDraft.assignment_role_code}
                  options={roleOptions}
                  showClear
                  filter
                  className="w-full"
                  onChange={(event) =>
                    setItemDraft({
                      ...itemDraft,
                      assignment_role_code: event.value ?? null,
                      primary_assignee_employee_id: null,
                    })
                  }
                />
              </label>
            )}
            {itemDraft.assignment_source === "ROLE" &&
              itemDraft.assignment_role_code && (
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  {i18nT("static.1xh9qg0")}{" "}
                  <Dropdown
                    value={itemDraft.primary_assignee_employee_id}
                    options={assignees
                      .filter(
                        (item) =>
                          item.role_code.toLowerCase() ===
                          itemDraft.assignment_role_code?.toLowerCase(),
                      )
                      .map((item) => ({
                        label: i18nT("static.14r9r1n", {
                          p0: item.name,
                          p1: item.username,
                        }),
                        value: item.employee_id,
                      }))}
                    showClear
                    filter
                    className="w-full"
                    onChange={(event) =>
                      setItemDraft({
                        ...itemDraft,
                        primary_assignee_employee_id: event.value ?? null,
                      })
                    }
                  />
                </label>
              )}
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {i18nT("static.l9pwyq")}{" "}
              <InputNumber
                value={itemDraft.due_offset_days}
                min={0}
                max={3650}
                showButtons
                onValueChange={(event) =>
                  setItemDraft({
                    ...itemDraft,
                    due_offset_days: event.value ?? null,
                  })
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {i18nT("static.27t6ak")}{" "}
              <InputNumber
                value={itemDraft.reminder_days_before}
                min={0}
                max={365}
                showButtons
                onValueChange={(event) =>
                  setItemDraft({
                    ...itemDraft,
                    reminder_days_before: event.value ?? null,
                  })
                }
              />
            </label>
            <label className="flex items-center gap-3 pt-7 text-sm font-medium text-slate-700">
              {i18nT("static.mq0cow")}{" "}
              <InputSwitch
                checked={itemDraft.is_required}
                onChange={(event) =>
                  setItemDraft({ ...itemDraft, is_required: event.value })
                }
              />
            </label>
            <label className="flex items-center gap-3 pt-7 text-sm font-medium text-slate-700">
              {i18nT("static.egtamv")}{" "}
              <InputSwitch
                checked={itemDraft.notify_on_activation}
                onChange={(event) =>
                  setItemDraft({
                    ...itemDraft,
                    notify_on_activation: event.value,
                  })
                }
              />
            </label>
            <label className="flex items-center gap-3 pt-7 text-sm font-medium text-slate-700">
              {i18nT("static.pt59w4")}{" "}
              <InputSwitch
                checked={itemDraft.is_active}
                onChange={(event) =>
                  setItemDraft({ ...itemDraft, is_active: event.value })
                }
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.sjj37t")}{" "}
            <InputTextarea
              value={itemDraft.description ?? ""}
              rows={3}
              autoResize
              onChange={(event) =>
                setItemDraft({
                  ...itemDraft,
                  description: event.target.value || null,
                })
              }
            />
          </label>
        </div>
      </Dialog>
    </div>
  );
}
