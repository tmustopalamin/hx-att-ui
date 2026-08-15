"use client";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Tag } from "primereact/tag";
import PrimeDatePicker from "@/app/_components/PrimeDatePicker";
import { useDispatch, useSelector } from "react-redux";
import {
  createAssetCategory,
  createCompanyAsset,
  getAssetAssignments,
  getAssetCategories,
  getCompanyAssets,
  getCompanyAssetStatusHistory,
  assignCompanyAsset,
  returnCompanyAsset,
  updateCompanyAssetStatus,
} from "@/app/services/company-asset-service";
import type {
  AssetAssignment,
  CompanyAsset,
  CompanyAssetStatusHistory,
} from "@/app/types/company-asset";
import type { Employee } from "@/app/types/employee";
import { fetcher } from "@/app/utils/fetcher";
import { showToast } from "@/store/ToastSlice";
import type { RootState } from "@/store/store";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
const emptyAsset = {
  asset_category_id: 0,
  asset_tag: "",
  name: "",
  serial_number: "",
  acquired_date: "",
  notes: "",
};

export default function AssetsData() {
  const dispatch = useDispatch();
  const permissions = useSelector(
    (state: RootState) => state.profile.permissions,
  );
  const canManage = permissions.includes("asset.manage");
  const canAssign = permissions.includes("asset.assign");
  const { data: categories = [], mutate: reloadCategories } = useSWR(
    "asset-categories",
    getAssetCategories,
  );
  const {
    data: assets = [],
    mutate: reloadAssets,
    isValidating,
  } = useSWR("assets", getCompanyAssets);
  const { data: assignments = [], mutate: reloadAssignments } = useSWR(
    "asset-assignments",
    getAssetAssignments,
  );
  const { data: employees = [] } = useSWR<Employee[]>(
    "/api/employees/list?show_all=false",
    fetcher,
  );
  const [assetVisible, setAssetVisible] = useState(false);
  const [categoryVisible, setCategoryVisible] = useState(false);
  const [assigning, setAssigning] = useState<CompanyAsset | null>(null);
  const [historyAsset, setHistoryAsset] = useState<CompanyAsset | null>(null);
  const { data: statusHistory = [], isLoading: historyLoading } = useSWR<
    CompanyAssetStatusHistory[]
  >(historyAsset ? `asset-status-history-${historyAsset.id}` : null, () =>
    getCompanyAssetStatusHistory(historyAsset!.id),
  );
  const [asset, setAsset] = useState(emptyAsset);
  const [category, setCategory] = useState({
    code: "",
    name: "",
    description: "",
  });
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const employeeOptions = useMemo(
    () =>
      employees.map((item) => ({
        label: item.full_name || `${item.first_name} ${item.last_name}`,
        value: item.id,
      })),
    [employees],
  );
  const toast = (
    severity: "success" | "error",
    summary: string,
    detail: string,
  ) => dispatch(showToast({ visible: true, severity, summary, detail }));
  const refresh = async () => {
    await Promise.all([
      reloadCategories(),
      reloadAssets(),
      reloadAssignments(),
    ]);
  };
  const createCategory = async () => {
    if (!category.code.trim() || !category.name.trim()) {
      toast("error", "Validation", "Code and name are required.");
      return;
    }
    setSaving(true);
    try {
      await createAssetCategory(category);
      setCategoryVisible(false);
      setCategory({ code: "", name: "", description: "" });
      await reloadCategories();
      toast("success", "Saved", "Asset category created.");
    } catch {
      toast("error", "Unable to save", "Asset category could not be created.");
    } finally {
      setSaving(false);
    }
  };
  const createAsset = async () => {
    if (
      !asset.asset_category_id ||
      !asset.asset_tag.trim() ||
      !asset.name.trim()
    ) {
      toast(
        "error",
        "Validation",
        "Category, asset tag, and name are required.",
      );
      return;
    }
    setSaving(true);
    try {
      await createCompanyAsset({
        ...asset,
        serial_number: asset.serial_number || null,
        acquired_date: asset.acquired_date || null,
        notes: asset.notes || null,
      });
      setAssetVisible(false);
      setAsset(emptyAsset);
      await reloadAssets();
      toast("success", "Saved", "Company asset created.");
    } catch {
      toast(
        "error",
        "Unable to save",
        "Asset tag may already exist or category is invalid.",
      );
    } finally {
      setSaving(false);
    }
  };
  const assign = async () => {
    if (!assigning || !employeeId) {
      toast("error", "Validation", "Select an employee.");
      return;
    }
    setSaving(true);
    try {
      await assignCompanyAsset(assigning.id, assigning.row_version, {
        employee_id: employeeId,
        due_return_date: dueDate || null,
        note: note || null,
      });
      setAssigning(null);
      setEmployeeId(null);
      setDueDate("");
      setNote("");
      await refresh();
      toast("success", "Assigned", "Asset assignment created.");
    } catch {
      toast(
        "error",
        "Unable to assign",
        "Asset may no longer be available. Refresh and try again.",
      );
    } finally {
      setSaving(false);
    }
  };
  const returnAsset = async (row: AssetAssignment) => {
    setSaving(true);
    try {
      await returnCompanyAsset(row.id, row.row_version);
      await refresh();
      toast("success", "Returned", "Asset is available again.");
    } catch {
      toast(
        "error",
        "Unable to return",
        "Assignment changed or has already been returned.",
      );
    } finally {
      setSaving(false);
    }
  };
  const confirmReturnAsset = (row: AssetAssignment) => {
    requestActionConfirmation({
      action: "Return asset",
      target: `${row.asset_tag} · ${row.employee_name}`,
      severity: "warning",
      confirmLabel: "Return Asset",
      confirmIcon: "pi pi-undo",
      description: "Close this assignment and return the asset?",
      onAccept: () => returnAsset(row),
    });
  };
  const changeAssetStatus = async (
    row: CompanyAsset,
    status: "AVAILABLE" | "REPAIR" | "RETIRED",
  ) => {
    setSaving(true);
    try {
      await updateCompanyAssetStatus(row.id, row.row_version, status);
      await reloadAssets();
      toast("success", "Updated", `Asset is now ${status.toLowerCase()}.`);
    } catch {
      toast(
        "error",
        "Unable to update",
        "Asset changed, is assigned, or cannot use that status.",
      );
    } finally {
      setSaving(false);
    }
  };
  const confirmAssetStatus = (
    row: CompanyAsset,
    status: "AVAILABLE" | "REPAIR",
  ) => {
    const makingAvailable = status === "AVAILABLE";
    requestActionConfirmation({
      action: makingAvailable ? "Mark asset available" : "Send asset to repair",
      target: `${row.asset_tag} · ${row.name}`,
      severity: makingAvailable ? "warning" : "danger",
      confirmLabel: makingAvailable ? "Available" : "Repair",
      confirmIcon: makingAvailable ? "pi pi-check" : "pi pi-wrench",
      description: makingAvailable
        ? "Make this asset available for assignment?"
        : "Send this asset to repair?",
      onAccept: () => changeAssetStatus(row, status),
    });
  };
  const retireAsset = (row: CompanyAsset) =>
    requestActionConfirmation({
      action: "Retire asset",
      target: `${row.asset_tag} · ${row.name}`,
      severity: "danger",
      confirmLabel: "Retire",
      confirmIcon: "pi pi-ban",
      description: "Retire this asset? It cannot be assigned again.",
      onAccept: () => changeAssetStatus(row, "RETIRED"),
    });
  return (
    <>
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="m-0 text-xl font-semibold text-slate-800 sm:text-2xl">
                Company Assets
              </h1>
              <p className="m-0 mt-1 text-sm text-slate-500">
                Register, assign, and clear company assets during the employee
                lifecycle.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                label="Refresh"
                icon="pi pi-refresh"
                outlined
                severity="secondary"
                size="small"
                loading={isValidating}
                onClick={() => void refresh()}
              />
              {canManage && (
                <Button
                  label="New Category"
                  icon="pi pi-tags"
                  outlined
                  size="small"
                  onClick={() => setCategoryVisible(true)}
                />
              )}{" "}
              {canManage && (
                <Button
                  label="New Asset"
                  icon="pi pi-plus"
                  size="small"
                  onClick={() => setAssetVisible(true)}
                />
              )}
            </div>
          </div>
          <DataTable
            value={assets}
            dataKey="id"
            paginator
            rows={10}
            stripedRows
            rowHover
            size="small"
            emptyMessage="No company asset found."
          >
            <Column field="asset_tag" header="Asset Tag" />
            <Column field="name" header="Asset" />
            <Column field="category_name" header="Category" />
            <Column field="serial_number" header="Serial Number" />
            <Column
              header="Status"
              body={(row: CompanyAsset) => (
                <Tag
                  value={row.status}
                  severity={row.status === "AVAILABLE" ? "success" : "warning"}
                />
              )}
            />
            <Column
              header="Action"
              body={(row: CompanyAsset) => (
                <div className="flex flex-wrap gap-1">
                  <Button
                    label="History"
                    icon="pi pi-history"
                    text
                    severity="secondary"
                    size="small"
                    onClick={() => setHistoryAsset(row)}
                  />
                  {canAssign && row.status === "AVAILABLE" ? (
                    <Button
                      label="Assign"
                      icon="pi pi-user-plus"
                      text
                      size="small"
                      onClick={() => setAssigning(row)}
                    />
                  ) : null}
                  {canManage && row.status === "AVAILABLE" ? (
                    <Button
                      label="Repair"
                      text
                      size="small"
                      onClick={() => confirmAssetStatus(row, "REPAIR")}
                    />
                  ) : null}
                  {canManage && row.status === "REPAIR" ? (
                    <Button
                      label="Available"
                      text
                      size="small"
                      onClick={() => confirmAssetStatus(row, "AVAILABLE")}
                    />
                  ) : null}
                  {canManage && ["AVAILABLE", "REPAIR"].includes(row.status) ? (
                    <Button
                      label="Retire"
                      text
                      severity="danger"
                      size="small"
                      onClick={() => retireAsset(row)}
                    />
                  ) : null}
                </div>
              )}
            />
          </DataTable>
          <h2 className="mb-0 mt-5 text-base font-semibold text-slate-800">
            Assignment History
          </h2>
          <DataTable
            value={assignments}
            dataKey="id"
            paginator
            rows={10}
            stripedRows
            rowHover
            size="small"
            emptyMessage="No asset assignment found."
          >
            <Column field="asset_tag" header="Asset Tag" />
            <Column field="asset_name" header="Asset" />
            <Column field="employee_name" header="Employee" />
            <Column
              header="Assigned"
              body={(row: AssetAssignment) =>
                new Date(row.assigned_at).toLocaleDateString()
              }
            />
            <Column
              header="Status"
              body={(row: AssetAssignment) => (
                <Tag
                  value={row.status}
                  severity={row.status === "RETURNED" ? "success" : "warning"}
                />
              )}
            />
            {canAssign && (
              <Column
                header="Action"
                body={(row: AssetAssignment) =>
                  row.status === "ASSIGNED" ? (
                    <Button
                      label="Return"
                      icon="pi pi-replay"
                      text
                      severity="secondary"
                      size="small"
                      disabled={saving}
                      onClick={() => confirmReturnAsset(row)}
                    />
                  ) : null
                }
              />
            )}
          </DataTable>
        </div>
      </Card>
      <Dialog
        header={
          historyAsset
            ? `Status History — ${historyAsset.asset_tag}`
            : "Asset Status History"
        }
        visible={historyAsset !== null}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "56rem" }}
        onHide={() => setHistoryAsset(null)}
        footer={
          <div className="flex justify-end">
            <Button
              label="Close"
              text
              severity="secondary"
              onClick={() => setHistoryAsset(null)}
            />
          </div>
        }
      >
        <DataTable
          value={statusHistory}
          dataKey="id"
          loading={historyLoading}
          size="small"
          stripedRows
          rowHover
          emptyMessage="No asset status history found."
        >
          <Column field="previous_status" header="Previous Status" />
          <Column field="new_status" header="New Status" />
          <Column field="changed_by_name" header="Changed By" />
          <Column
            field="change_reason"
            header="Reason"
            body={(row: CompanyAssetStatusHistory) => row.change_reason || "—"}
          />
          <Column
            header="Changed At"
            body={(row: CompanyAssetStatusHistory) =>
              new Date(row.changed_at).toLocaleString()
            }
          />
        </DataTable>
      </Dialog>
      <Dialog
        header="New Asset Category"
        visible={categoryVisible}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "32rem" }}
        onHide={() => !saving && setCategoryVisible(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Cancel"
              text
              severity="secondary"
              onClick={() => setCategoryVisible(false)}
            />
            <Button
              label="Save"
              icon="pi pi-check"
              loading={saving}
              onClick={() => void createCategory()}
            />
          </div>
        }
      >
        <div className="grid gap-4 py-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Code
            <InputText
              value={category.code}
              onChange={(event) =>
                setCategory({ ...category, code: event.target.value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Name
            <InputText
              value={category.name}
              onChange={(event) =>
                setCategory({ ...category, name: event.target.value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Description{" "}
            <span className="font-normal text-slate-400">(optional)</span>
            <InputTextarea
              value={category.description}
              rows={3}
              autoResize
              onChange={(event) =>
                setCategory({ ...category, description: event.target.value })
              }
            />
          </label>
        </div>
      </Dialog>
      <Dialog
        header="New Company Asset"
        visible={assetVisible}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "38rem" }}
        onHide={() => !saving && setAssetVisible(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Cancel"
              text
              severity="secondary"
              onClick={() => setAssetVisible(false)}
            />
            <Button
              label="Save"
              icon="pi pi-check"
              loading={saving}
              onClick={() => void createAsset()}
            />
          </div>
        }
      >
        <div className="grid gap-4 py-2 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Category
            <Dropdown
              value={asset.asset_category_id || null}
              options={categories.filter((item) => item.is_active)}
              optionLabel="name"
              optionValue="id"
              placeholder="Select category"
              className="w-full"
              onChange={(event) =>
                setAsset({ ...asset, asset_category_id: event.value as number })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Asset Tag
            <InputText
              value={asset.asset_tag}
              onChange={(event) =>
                setAsset({ ...asset, asset_tag: event.target.value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Asset Name
            <InputText
              value={asset.name}
              onChange={(event) =>
                setAsset({ ...asset, name: event.target.value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Serial Number{" "}
            <span className="font-normal text-slate-400">(optional)</span>
            <InputText
              value={asset.serial_number}
              onChange={(event) =>
                setAsset({ ...asset, serial_number: event.target.value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Acquired Date{" "}
            <span className="font-normal text-slate-400">(optional)</span>
            <PrimeDatePicker
              value={asset.acquired_date}
              onValueChange={(value) =>
                setAsset({ ...asset, acquired_date: value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Notes <span className="font-normal text-slate-400">(optional)</span>
            <InputTextarea
              value={asset.notes}
              rows={2}
              autoResize
              onChange={(event) =>
                setAsset({ ...asset, notes: event.target.value })
              }
            />
          </label>
        </div>
      </Dialog>
      <Dialog
        header={assigning ? `Assign ${assigning.asset_tag}` : "Assign Asset"}
        visible={assigning !== null}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "32rem" }}
        onHide={() => !saving && setAssigning(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Cancel"
              text
              severity="secondary"
              onClick={() => setAssigning(null)}
            />
            <Button
              label="Assign"
              icon="pi pi-user-plus"
              loading={saving}
              onClick={() => {
                if (!assigning || !employeeId) {
                  void assign();
                  return;
                }
                requestActionConfirmation({
                  action: "Assign asset",
                  target: `${assigning.asset_tag} · ${employeeOptions.find((item) => item.value === employeeId)?.label ?? "selected employee"}`,
                  severity: "warning",
                  confirmLabel: "Assign Asset",
                  confirmIcon: "pi pi-user-plus",
                  description: "Assign this asset to the selected employee?",
                  onAccept: () => assign(),
                });
              }}
            />
          </div>
        }
      >
        <div className="grid gap-4 py-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Employee
            <Dropdown
              value={employeeId}
              options={employeeOptions}
              filter
              placeholder="Select employee"
              className="w-full"
              onChange={(event) => setEmployeeId(event.value as number)}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Due Return Date{" "}
            <span className="font-normal text-slate-400">(optional)</span>
            <PrimeDatePicker value={dueDate} onValueChange={setDueDate} />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Assignment Note{" "}
            <span className="font-normal text-slate-400">(optional)</span>
            <InputTextarea
              value={note}
              rows={3}
              autoResize
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
        </div>
      </Dialog>
    </>
  );
}
