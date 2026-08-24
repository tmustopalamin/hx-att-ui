"use client";
import { useI18n } from "@/app/i18n";
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
import {
  formatDate as formatDisplayDate,
  formatDateTime as formatDisplayDateTime,
} from "@/app/utils/date-format";
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
import { isWhitespaceFreeIdentifier } from "@/app/utils/identifier-validation";
const emptyAsset = {
  asset_category_id: 0,
  asset_tag: "",
  name: "",
  serial_number: "",
  acquired_date: "",
  notes: "",
};

export default function AssetsData() {
  const { t: i18nT } = useI18n();
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
        label:
          item.full_name ||
          i18nT("static.y7k7q", { p0: item.first_name, p1: item.last_name }),
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
    if (!isWhitespaceFreeIdentifier(category.code)) {
      toast(
        "error",
        i18nT("static.gy1qqi"),
        i18nT("validation.codeNoWhitespace"),
      );
      return;
    }
    if (!category.code.trim() || !category.name.trim()) {
      toast("error", i18nT("static.gy1qqi"), i18nT("static.u9zubr"));
      return;
    }
    setSaving(true);
    try {
      await createAssetCategory(category);
      setCategoryVisible(false);
      setCategory({ code: "", name: "", description: "" });
      await reloadCategories();
      toast("success", i18nT("static.12ek4is"), i18nT("static.1dfrmnh"));
    } catch {
      toast("error", i18nT("static.rulhkg"), i18nT("static.5z3mo0"));
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
      toast("error", i18nT("static.gy1qqi"), i18nT("static.pyqp5g"));
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
      toast("success", i18nT("static.12ek4is"), i18nT("static.1goqi12"));
    } catch {
      toast("error", i18nT("static.rulhkg"), i18nT("static.1ka90ht"));
    } finally {
      setSaving(false);
    }
  };
  const assign = async () => {
    if (!assigning || !employeeId) {
      toast("error", i18nT("static.gy1qqi"), i18nT("static.d3wvx2"));
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
      toast("success", i18nT("static.c1fxel"), i18nT("static.17ogd92"));
    } catch {
      toast("error", i18nT("static.o0zxlg"), i18nT("static.bnzo41"));
    } finally {
      setSaving(false);
    }
  };
  const returnAsset = async (row: AssetAssignment) => {
    setSaving(true);
    try {
      await returnCompanyAsset(row.id, row.row_version);
      await refresh();
      toast("success", i18nT("static.o3gxi6"), i18nT("static.q2ukp4"));
    } catch {
      toast("error", i18nT("static.5ibdzr"), i18nT("static.9mkdq"));
    } finally {
      setSaving(false);
    }
  };
  const confirmReturnAsset = (row: AssetAssignment) => {
    requestActionConfirmation({
      action: i18nT("static.10cwp77"),
      target: `${row.asset_tag} · ${row.employee_name}`,
      severity: "warning",
      confirmLabel: i18nT("static.1pekgdv"),
      confirmIcon: "pi pi-undo",
      description: i18nT("static.18gqw5p"),
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
      toast(
        "success",
        i18nT("static.miz9ao"),
        i18nT("static.f9mqsv", { p0: status.toLowerCase() }),
      );
    } catch {
      toast("error", i18nT("static.1yhx6qk"), i18nT("static.1hscwqt"));
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
      action: makingAvailable
        ? i18nT("static.1rn578b")
        : i18nT("static.1tfd4jh"),
      target: `${row.asset_tag} · ${row.name}`,
      severity: makingAvailable ? "warning" : "danger",
      confirmLabel: makingAvailable
        ? i18nT("static.vp7tiw")
        : i18nT("static.nvzxsk"),
      confirmIcon: makingAvailable ? "pi pi-check" : "pi pi-wrench",
      description: makingAvailable
        ? i18nT("static.9zlajj")
        : i18nT("static.qh3tcc"),
      onAccept: () => changeAssetStatus(row, status),
    });
  };
  const retireAsset = (row: CompanyAsset) =>
    requestActionConfirmation({
      action: i18nT("static.xhtag6"),
      target: `${row.asset_tag} · ${row.name}`,
      severity: "danger",
      confirmLabel: i18nT("static.rgquxi"),
      confirmIcon: "pi pi-ban",
      description: i18nT("static.1m214x2"),
      onAccept: () => changeAssetStatus(row, "RETIRED"),
    });
  return (
    <>
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="m-0 text-xl font-semibold text-slate-800 sm:text-2xl">
                {i18nT("static.5q1akd")}{" "}
              </h1>
              <p className="m-0 mt-1 text-sm text-slate-500">
                {i18nT("static.o1kv1b")}{" "}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                label={i18nT("static.28r6qc")}
                icon="pi pi-refresh"
                outlined
                severity="secondary"
                size="small"
                loading={isValidating}
                onClick={() => void refresh()}
              />
              {canManage && (
                <Button
                  label={i18nT("static.766xs7")}
                  icon="pi pi-tags"
                  outlined
                  size="small"
                  onClick={() => setCategoryVisible(true)}
                />
              )}{" "}
              {canManage && (
                <Button
                  label={i18nT("static.xjax05")}
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
            emptyMessage={i18nT("static.p4aknd")}
          >
            <Column field="asset_tag" header={i18nT("static.1h07jp3")} />
            <Column field="name" header={i18nT("static.108qnnf")} />
            <Column field="category_name" header={i18nT("static.1cr1mz5")} />
            <Column field="serial_number" header={i18nT("static.wq722")} />
            <Column
              header={i18nT("static.3pd73")}
              body={(row: CompanyAsset) => (
                <Tag
                  value={row.status}
                  severity={row.status === "AVAILABLE" ? "success" : "warning"}
                />
              )}
            />
            <Column
              header={i18nT("static.2wk0tb")}
              body={(row: CompanyAsset) => (
                <div className="flex flex-wrap gap-1">
                  <Button
                    label={i18nT("static.yugfpb")}
                    icon="pi pi-history"
                    text
                    severity="secondary"
                    size="small"
                    onClick={() => setHistoryAsset(row)}
                  />
                  {canAssign && row.status === "AVAILABLE" ? (
                    <Button
                      label={i18nT("static.1f128rw")}
                      icon="pi pi-user-plus"
                      text
                      size="small"
                      onClick={() => setAssigning(row)}
                    />
                  ) : null}
                  {canManage && row.status === "AVAILABLE" ? (
                    <Button
                      label={i18nT("static.nvzxsk")}
                      text
                      size="small"
                      onClick={() => confirmAssetStatus(row, "REPAIR")}
                    />
                  ) : null}
                  {canManage && row.status === "REPAIR" ? (
                    <Button
                      label={i18nT("static.vp7tiw")}
                      text
                      size="small"
                      onClick={() => confirmAssetStatus(row, "AVAILABLE")}
                    />
                  ) : null}
                  {canManage && ["AVAILABLE", "REPAIR"].includes(row.status) ? (
                    <Button
                      label={i18nT("static.rgquxi")}
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
            {i18nT("static.1qhibpk")}{" "}
          </h2>
          <DataTable
            value={assignments}
            dataKey="id"
            paginator
            rows={10}
            stripedRows
            rowHover
            size="small"
            emptyMessage={i18nT("static.1plqyr3")}
          >
            <Column field="asset_tag" header={i18nT("static.1h07jp3")} />
            <Column field="asset_name" header={i18nT("static.108qnnf")} />
            <Column field="employee_name" header={i18nT("static.1fak8xt")} />
            <Column
              header={i18nT("static.c1fxel")}
              body={(row: AssetAssignment) =>
                formatDisplayDate(row.assigned_at)
              }
            />
            <Column
              header={i18nT("static.3pd73")}
              body={(row: AssetAssignment) => (
                <Tag
                  value={row.status}
                  severity={row.status === "RETURNED" ? "success" : "warning"}
                />
              )}
            />
            {canAssign && (
              <Column
                header={i18nT("static.2wk0tb")}
                body={(row: AssetAssignment) =>
                  row.status === "ASSIGNED" ? (
                    <Button
                      label={i18nT("static.1klrjrz")}
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
            ? i18nT("static.1luzjnj", { p0: historyAsset.asset_tag })
            : i18nT("static.1am9nmz")
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
              label={i18nT("static.1l0xxoj")}
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
          emptyMessage={i18nT("static.37wpjq")}
        >
          <Column field="previous_status" header={i18nT("static.ql6ue2")} />
          <Column field="new_status" header={i18nT("static.14zuqhh")} />
          <Column field="changed_by_name" header={i18nT("static.1sebngg")} />
          <Column
            field="change_reason"
            header={i18nT("static.i36sl5")}
            body={(row: CompanyAssetStatusHistory) => row.change_reason || "—"}
          />
          <Column
            header={i18nT("static.1r046ho")}
            body={(row: CompanyAssetStatusHistory) =>
              formatDisplayDateTime(row.changed_at)
            }
          />
        </DataTable>
      </Dialog>
      <Dialog
        header={i18nT("static.ecq0eb")}
        visible={categoryVisible}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "32rem" }}
        onHide={() => !saving && setCategoryVisible(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label={i18nT("static.ew9em3")}
              text
              severity="secondary"
              onClick={() => setCategoryVisible(false)}
            />
            <Button
              label={i18nT("static.lewgh4")}
              icon="pi pi-check"
              loading={saving}
              onClick={() => void createCategory()}
            />
          </div>
        }
      >
        <div className="grid gap-4 py-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.xoaiok")}{" "}
            <InputText
              value={category.code}
              onChange={(event) =>
                setCategory({ ...category, code: event.target.value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.4el6o6")}{" "}
            <InputText
              value={category.name}
              onChange={(event) =>
                setCategory({ ...category, name: event.target.value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.sjj37t")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.6pi6gi")}
            </span>
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
        header={i18nT("static.hg20cq")}
        visible={assetVisible}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "38rem" }}
        onHide={() => !saving && setAssetVisible(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label={i18nT("static.ew9em3")}
              text
              severity="secondary"
              onClick={() => setAssetVisible(false)}
            />
            <Button
              label={i18nT("static.lewgh4")}
              icon="pi pi-check"
              loading={saving}
              onClick={() => void createAsset()}
            />
          </div>
        }
      >
        <div className="grid gap-4 py-2 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.1cr1mz5")}{" "}
            <Dropdown
              value={asset.asset_category_id || null}
              options={categories.filter((item) => item.is_active)}
              optionLabel="name"
              optionValue="id"
              placeholder={i18nT("static.1fq1nm3")}
              className="w-full"
              onChange={(event) =>
                setAsset({ ...asset, asset_category_id: event.value as number })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.1h07jp3")}{" "}
            <InputText
              value={asset.asset_tag}
              onChange={(event) =>
                setAsset({ ...asset, asset_tag: event.target.value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.zp6dy2")}{" "}
            <InputText
              value={asset.name}
              onChange={(event) =>
                setAsset({ ...asset, name: event.target.value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.wq722")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.6pi6gi")}
            </span>
            <InputText
              value={asset.serial_number}
              onChange={(event) =>
                setAsset({ ...asset, serial_number: event.target.value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.1t63ewb")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.6pi6gi")}
            </span>
            <PrimeDatePicker
              value={asset.acquired_date}
              onValueChange={(value) =>
                setAsset({ ...asset, acquired_date: value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.4f76ga")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.6pi6gi")}
            </span>
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
        header={
          assigning
            ? i18nT("static.16byc54", { p0: assigning.asset_tag })
            : i18nT("static.ipfv7w")
        }
        visible={assigning !== null}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "32rem" }}
        onHide={() => !saving && setAssigning(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label={i18nT("static.ew9em3")}
              text
              severity="secondary"
              onClick={() => setAssigning(null)}
            />
            <Button
              label={i18nT("static.1f128rw")}
              icon="pi pi-user-plus"
              loading={saving}
              onClick={() => {
                if (!assigning || !employeeId) {
                  void assign();
                  return;
                }
                requestActionConfirmation({
                  action: i18nT("static.1xy7i3w"),
                  target: `${assigning.asset_tag} · ${employeeOptions.find((item) => item.value === employeeId)?.label ?? "selected employee"}`,
                  severity: "warning",
                  confirmLabel: i18nT("static.ipfv7w"),
                  confirmIcon: "pi pi-user-plus",
                  description: i18nT("static.db9x32"),
                  onAccept: () => assign(),
                });
              }}
            />
          </div>
        }
      >
        <div className="grid gap-4 py-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.1fak8xt")}{" "}
            <Dropdown
              value={employeeId}
              options={employeeOptions}
              filter
              placeholder={i18nT("static.1izgm0n")}
              className="w-full"
              onChange={(event) => setEmployeeId(event.value as number)}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.ve1zo3")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.6pi6gi")}
            </span>
            <PrimeDatePicker value={dueDate} onValueChange={setDueDate} />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.1cyijd8")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.6pi6gi")}
            </span>
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
