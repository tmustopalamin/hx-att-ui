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
  label: string;
  value: EmployeeLifecycleChecklistTemplateInput["lifecycle_type"];
}[] = [
  { label: "Onboarding", value: "ONBOARDING" },
  { label: "Employment Change", value: "EMPLOYMENT_CHANGE" },
  { label: "Offboarding", value: "OFFBOARDING" },
];

const sourceOptions: { label: string; value: LifecycleAssignmentSource }[] = [
  { label: "Employee", value: "EMPLOYEE" },
  { label: "Supervisor / Manager", value: "SUPERVISOR" },
  { label: "Existing Role", value: "ROLE" },
  { label: "Manual Assignment", value: "MANUAL" },
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

const formatDate = (value: string | null) => value || "-";

export default function EmployeeLifecycleSettingsData() {
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
        summary: severity === "success" ? "Success" : "Error",
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
      notify("error", "Task code and name are required.");
      return;
    }
    if (
      itemDraft.assignment_source === "ROLE" &&
      !itemDraft.assignment_role_code
    ) {
      notify("error", "Select a role for role-based assignment.");
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
      notify(
        "error",
        "Template code, name, and at least one task are required.",
      );
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
      notify("success", "Lifecycle template version created.");
    } catch (caught: unknown) {
      notify(
        "error",
        isResponseTypeError(caught)
          ? getErrorMessage(caught, "message")
          : caught instanceof Error
            ? caught.message
            : "Unable to save lifecycle template.",
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
      notify("success", "Lifecycle template status updated.");
    } catch (caught: unknown) {
      notify(
        "error",
        isResponseTypeError(caught)
          ? getErrorMessage(caught, "message")
          : "Unable to update lifecycle template status.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <Card className="border border-red-200">
        <p className="m-0 text-sm text-red-600">
          Unable to load employee lifecycle configuration.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-4 p-3 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="m-0 text-xl font-semibold text-slate-800 sm:text-2xl">
              Employee Lifecycle Configuration
            </h1>
            <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
              Configure versioned checklist templates, task owners, due dates,
              and reminders.
            </p>
          </div>
          {canManage && (
            <Button
              label="New Template Version"
              icon="pi pi-plus"
              size="small"
              onClick={() => openNewTemplate()}
            />
          )}
        </div>
      </Card>

      <Card
        title="Lifecycle Types"
        className="border border-slate-200 shadow-sm"
      >
        <DataTable
          value={settings?.types ?? []}
          loading={isLoading}
          size="small"
          stripedRows
        >
          <Column field="name" header="Lifecycle Type" />
          <Column field="lifecycle_type" header="Code" />
          <Column
            field="description"
            header="Description"
            body={(row) => row.description || "-"}
          />
          <Column
            header="Status"
            body={(row) => (
              <Tag
                value={row.is_active ? "ACTIVE" : "INACTIVE"}
                severity={row.is_active ? "success" : "secondary"}
              />
            )}
          />
        </DataTable>
      </Card>

      <Card
        title="Checklist Templates"
        className="border border-slate-200 shadow-sm"
      >
        <DataTable
          value={settings?.templates ?? []}
          loading={isLoading}
          dataKey="id"
          size="small"
          stripedRows
          rowHover
          emptyMessage="No lifecycle template found."
        >
          <Column field="lifecycle_type" header="Type" />
          <Column field="code" header="Code" />
          <Column field="name" header="Name" />
          <Column field="version_no" header="Version" />
          <Column
            header="Effective"
            body={(row) =>
              `${formatDate(row.effective_from)} - ${formatDate(row.effective_to)}`
            }
          />
          <Column header="Tasks" body={(row) => row.items.length} />
          <Column
            header="Status"
            body={(row) => (
              <Tag
                value={row.is_active ? "ACTIVE" : "INACTIVE"}
                severity={row.is_active ? "success" : "secondary"}
              />
            )}
          />
          <Column
            header="Action"
            body={(row: EmployeeLifecycleChecklistTemplateSetting) => (
              <div className="flex justify-end gap-1">
                {canManage && (
                  <>
                    <Button
                      icon="pi pi-copy"
                      text
                      rounded
                      aria-label="New version"
                      tooltip="New version"
                      onClick={() => openNewTemplate(row)}
                    />
                    <Button
                      icon={row.is_active ? "pi pi-pause" : "pi pi-play"}
                      text
                      rounded
                      severity={row.is_active ? "warning" : "success"}
                      aria-label={row.is_active ? "Deactivate" : "Activate"}
                      tooltip={row.is_active ? "Deactivate" : "Activate"}
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
        header="New Lifecycle Template Version"
        visible={templateDialog}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "96vw", maxWidth: "72rem" }}
        onHide={() => !saving && setTemplateDialog(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Cancel"
              text
              severity="secondary"
              disabled={saving}
              onClick={() => setTemplateDialog(false)}
            />
            <Button
              label="Save Version"
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
              Lifecycle Type
              <Dropdown
                value={draft.lifecycle_type}
                options={typeOptions}
                className="w-full"
                onChange={(event) =>
                  setDraft({ ...draft, lifecycle_type: event.value })
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Template Code
              <InputText
                value={draft.code}
                className="w-full"
                onChange={(event) =>
                  setDraft({ ...draft, code: event.target.value })
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Template Name
              <InputText
                value={draft.name}
                className="w-full"
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Effective From
              <PrimeDatePicker
                value={draft.effective_from}
                className="w-full"
                onValueChange={(value) =>
                  setDraft({ ...draft, effective_from: value })
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Effective To{" "}
              <span className="font-normal text-slate-400">(optional)</span>
              <PrimeDatePicker
                value={draft.effective_to}
                className="w-full"
                onValueChange={(value) =>
                  setDraft({ ...draft, effective_to: value || null })
                }
              />
            </label>
            <label className="flex items-center gap-3 pt-7 text-sm font-medium text-slate-700">
              Active for new cases
              <InputSwitch
                checked={draft.is_active}
                onChange={(event) =>
                  setDraft({ ...draft, is_active: event.value })
                }
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Description
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
                Checklist Items
              </span>
              <Button
                label="Add Task"
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
              emptyMessage="Add at least one checklist task."
            >
              <Column field="sequence_no" header="#" />
              <Column field="name" header="Task" />
              <Column field="assignment_source" header="Owner Policy" />
              <Column
                header="Role"
                body={(row) => row.assignment_role_code || "-"}
              />
              <Column
                header="Required"
                body={(row) => (row.is_required ? "Yes" : "No")}
              />
              <Column
                header="Due"
                body={(row) =>
                  row.due_offset_days === null
                    ? "-"
                    : `+${row.due_offset_days} days`
                }
              />
              <Column
                header="Status"
                body={(row) => (
                  <Tag
                    value={row.is_active ? "ACTIVE" : "INACTIVE"}
                    severity={row.is_active ? "success" : "secondary"}
                  />
                )}
              />
              <Column
                header="Action"
                body={(row: EmployeeLifecycleChecklistItemInput) => {
                  const index = draft.items.indexOf(row);
                  return (
                    <div className="flex justify-end gap-1">
                      <Button
                        icon="pi pi-pencil"
                        text
                        rounded
                        aria-label="Edit task"
                        tooltip="Edit task"
                        onClick={() => openEditItem(row, index)}
                      />
                      <Button
                        icon="pi pi-trash"
                        text
                        rounded
                        severity="danger"
                        aria-label="Delete task"
                        tooltip="Delete task"
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
            ? "Add Checklist Task"
            : "Edit Checklist Task"
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
              label="Cancel"
              text
              severity="secondary"
              onClick={() => setItemDialog(false)}
            />
            <Button label="Save Task" icon="pi pi-check" onClick={saveItem} />
          </div>
        }
      >
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Task Code
              <InputText
                value={itemDraft.code}
                onChange={(event) =>
                  setItemDraft({ ...itemDraft, code: event.target.value })
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Task Name
              <InputText
                value={itemDraft.name}
                onChange={(event) =>
                  setItemDraft({ ...itemDraft, name: event.target.value })
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Sequence
              <InputNumber
                value={itemDraft.sequence_no}
                min={1}
                onValueChange={(event) =>
                  setItemDraft({ ...itemDraft, sequence_no: event.value ?? 1 })
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Assignment Source
              <Dropdown
                value={itemDraft.assignment_source}
                options={sourceOptions}
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
                Role
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
                  Primary Assignee
                  <Dropdown
                    value={itemDraft.primary_assignee_employee_id}
                    options={assignees
                      .filter(
                        (item) =>
                          item.role_code.toLowerCase() ===
                          itemDraft.assignment_role_code?.toLowerCase(),
                      )
                      .map((item) => ({
                        label: `${item.name} (${item.username})`,
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
              Due Offset (days)
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
              Reminder Before (days)
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
              Required
              <InputSwitch
                checked={itemDraft.is_required}
                onChange={(event) =>
                  setItemDraft({ ...itemDraft, is_required: event.value })
                }
              />
            </label>
            <label className="flex items-center gap-3 pt-7 text-sm font-medium text-slate-700">
              Notify on activation
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
              Active task
              <InputSwitch
                checked={itemDraft.is_active}
                onChange={(event) =>
                  setItemDraft({ ...itemDraft, is_active: event.value })
                }
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Description
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
