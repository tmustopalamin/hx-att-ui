"use client";
import { useI18n } from "@/app/i18n";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import type { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import { fetcher } from "@/app/utils/fetcher";
import type { Employee } from "@/app/types/employee";
import type {
  EmployeeDocument,
  EmployeeDocumentFileVersion,
} from "@/app/types/employee-document";
import {
  createEmployeeDocument,
  createEmployeeDocumentType,
  getEmployeeDocuments,
  getEmployeeDocumentTypes,
  uploadEmployeeDocumentFile,
  verifyEmployeeDocument,
  updateEmployeeDocument,
  setEmployeeDocumentActive,
  getEmployeeDocumentVersions,
} from "@/app/services/employee-document-service";
import { isWhitespaceFreeIdentifier } from "@/app/utils/identifier-validation";

const emptyDocument = () => ({
  employee_id: 0,
  employee_document_type_id: 0,
  document_number: "",
  document_name: "",
  issued_date: "",
  expired_date: "",
  notes: "",
  is_primary: false,
});

const getBody = () => document.body;
const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;

export default function EmployeeDocumentsData() {
  const { t: i18nT } = useI18n();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const permissions = useSelector(
    (state: RootState) => state.profile.permissions,
  );
  const canCreate = permissions.includes("employee-document.create");
  const canUpdate = permissions.includes("employee-document.update");
  const canVerify = permissions.includes("employee-document.verify");
  const selectedEmployeeId = Number(searchParams.get("employee_id"));
  const employeeScoped =
    Number.isSafeInteger(selectedEmployeeId) && selectedEmployeeId > 0;
  const { data: types = [], mutate: reloadTypes } = useSWR(
    "employee-document-types",
    getEmployeeDocumentTypes,
  );
  const {
    data: documents = [],
    mutate: reloadDocuments,
    isValidating,
  } = useSWR(
    employeeScoped
      ? `employee-documents-${selectedEmployeeId}`
      : "employee-documents",
    () => getEmployeeDocuments(employeeScoped ? selectedEmployeeId : undefined),
  );
  const { data: employees = [] } = useSWR<Employee[]>(
    "/api/employees/list?show_all=false",
    fetcher,
  );
  const visibleDocuments = documents;
  const [visible, setVisible] = useState(false);
  const [typeVisible, setTypeVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [document, setDocument] = useState(emptyDocument);
  const [documentType, setDocumentType] = useState({
    code: "",
    name: "",
    requires_expiry: false,
    default_expiry_reminder_days: "",
    is_required_on_onboarding: false,
  });
  const [file, setFile] = useState<File | null>(null);
  const [rejecting, setRejecting] = useState<EmployeeDocument | null>(null);
  const [reason, setReason] = useState("");
  const [editing, setEditing] = useState<EmployeeDocument | null>(null);
  const [editForm, setEditForm] = useState({
    document_number: "",
    document_name: "",
    issued_date: "",
    expired_date: "",
    notes: "",
    is_primary: false,
  });
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [versionDocument, setVersionDocument] =
    useState<EmployeeDocument | null>(null);
  const { data: fileVersions = [], isLoading: versionsLoading } = useSWR<
    EmployeeDocumentFileVersion[]
  >(
    versionDocument ? `employee-document-versions-${versionDocument.id}` : null,
    () => getEmployeeDocumentVersions(versionDocument!.id),
  );
  const employeeOptions = useMemo(
    () =>
      employees.map((employee) => ({
        label:
          employee.full_name ||
          i18nT("static.y7k7q", {
            p0: employee.first_name,
            p1: employee.last_name,
          }),
        value: employee.id,
      })),
    [employees],
  );
  const toast = (
    severity: "success" | "error",
    summary: string,
    detail: string,
  ) => dispatch(showToast({ visible: true, severity, summary, detail }));
  const refresh = async () => {
    await Promise.all([reloadTypes(), reloadDocuments()]);
  };
  const openUpload = () => {
    setDocument({
      ...emptyDocument(),
      employee_id: employeeScoped ? selectedEmployeeId : 0,
    });
    setFile(null);
    setVisible(true);
  };

  const createType = async () => {
    if (!isWhitespaceFreeIdentifier(documentType.code)) {
      toast(
        "error",
        i18nT("static.gy1qqi"),
        i18nT("validation.codeNoWhitespace"),
      );
      return;
    }
    if (!documentType.code.trim() || !documentType.name.trim()) {
      toast("error", i18nT("static.gy1qqi"), i18nT("static.u9zubr"));
      return;
    }
    setSaving(true);
    try {
      await createEmployeeDocumentType({
        ...documentType,
        default_expiry_reminder_days: documentType.default_expiry_reminder_days
          ? Number(documentType.default_expiry_reminder_days)
          : null,
      });
      setTypeVisible(false);
      setDocumentType({
        code: "",
        name: "",
        requires_expiry: false,
        default_expiry_reminder_days: "",
        is_required_on_onboarding: false,
      });
      await reloadTypes();
      toast("success", i18nT("static.12ek4is"), i18nT("static.1mau0hg"));
    } catch {
      toast("error", i18nT("static.rulhkg"), i18nT("static.xbdvzh"));
    } finally {
      setSaving(false);
    }
  };
  const create = async () => {
    if (!document.employee_id || !document.employee_document_type_id || !file) {
      toast("error", i18nT("static.gy1qqi"), i18nT("static.lsnzjm"));
      return;
    }
    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      toast("error", i18nT("static.d2bjes"), i18nT("static.1r1nbzp"));
      return;
    }
    setSaving(true);
    try {
      const created = await createEmployeeDocument({
        ...document,
        document_number: document.document_number || null,
        document_name: document.document_name || null,
        issued_date: document.issued_date || null,
        expired_date: document.expired_date || null,
        notes: document.notes || null,
      });
      await uploadEmployeeDocumentFile(created.id, created.row_version, file);
      setVisible(false);
      setDocument(emptyDocument());
      setFile(null);
      await reloadDocuments();
      toast("success", i18nT("static.g8anu5"), i18nT("static.17av8xn"));
    } catch {
      toast("error", i18nT("static.d2bjes"), i18nT("static.1sj31zd"));
    } finally {
      setSaving(false);
    }
  };
  const verify = async (
    row: EmployeeDocument,
    status: "VERIFIED" | "REJECTED",
    rejectionReason: string | null = null,
  ) => {
    setSaving(true);
    try {
      await verifyEmployeeDocument(
        row.id,
        row.row_version,
        status,
        rejectionReason,
      );
      setRejecting(null);
      setReason("");
      await reloadDocuments();
      toast(
        "success",
        i18nT("static.miz9ao"),
        status === "VERIFIED"
          ? i18nT("static.1e7evya")
          : i18nT("static.1t4bhg8"),
      );
    } catch {
      toast("error", i18nT("static.1yhx6qk"), i18nT("static.ris6s6"));
    } finally {
      setSaving(false);
    }
  };
  const openEdit = (row: EmployeeDocument) => {
    setEditing(row);
    setEditForm({
      document_number: row.document_number || "",
      document_name: row.document_name || "",
      issued_date: row.issued_date || "",
      expired_date: row.expired_date || "",
      notes: row.notes || "",
      is_primary: row.is_primary,
    });
    setReplacementFile(null);
  };
  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const updated = await updateEmployeeDocument(
        editing.id,
        editing.row_version,
        {
          document_number: editForm.document_number || null,
          document_name: editForm.document_name || null,
          issued_date: editForm.issued_date || null,
          expired_date: editForm.expired_date || null,
          notes: editForm.notes || null,
          is_primary: editForm.is_primary,
        },
      );
      if (replacementFile)
        await uploadEmployeeDocumentFile(
          editing.id,
          updated.row_version,
          replacementFile,
        );
      setEditing(null);
      setReplacementFile(null);
      await reloadDocuments();
      toast("success", i18nT("static.miz9ao"), i18nT("static.67u8jr"));
    } catch {
      toast("error", i18nT("static.1yhx6qk"), i18nT("static.agc08d"));
    } finally {
      setSaving(false);
    }
  };
  const changeActive = async (row: EmployeeDocument, isActive: boolean) => {
    setSaving(true);
    try {
      await setEmployeeDocumentActive(row.id, row.row_version, isActive);
      await reloadDocuments();
      toast(
        "success",
        i18nT("static.miz9ao"),
        isActive ? i18nT("static.146ifvz") : i18nT("static.8vt6c"),
      );
    } catch {
      toast("error", i18nT("static.1yhx6qk"), i18nT("static.8ktbql"));
    } finally {
      setSaving(false);
    }
  };
  const confirmActive = (row: EmployeeDocument, isActive: boolean) =>
    requestActionConfirmation({
      header: isActive ? i18nT("static.1q4oec9") : i18nT("static.16fzu8g"),
      message: isActive ? i18nT("static.1uz36yu") : i18nT("static.zm5qco"),
      icon: "pi pi-exclamation-triangle",
      acceptLabel: isActive ? "Activate" : "Deactivate",
      rejectLabel: "Cancel",
      acceptClassName: isActive ? undefined : "p-button-danger",
      accept: () => void changeActive(row, isActive),
    });
  const confirmVerify = (row: EmployeeDocument) =>
    requestActionConfirmation({
      action: i18nT("static.11ruj3x"),
      target: `${row.employee_name} · ${row.document_name || "Document"}`,
      severity: "warning",
      confirmLabel: i18nT("static.cl30w4"),
      confirmIcon: "pi pi-check-circle",
      description: i18nT("static.nf1kgq"),
      onAccept: () => verify(row, "VERIFIED"),
    });

  return (
    <>
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="m-0 text-xl font-semibold text-slate-800 sm:text-2xl">
                {i18nT("static.1mmoilr")}{" "}
              </h1>
              <p className="m-0 mt-1 text-sm text-slate-500">
                {i18nT("static.1s05gvy")}{" "}
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
              {canUpdate && (
                <Button
                  label={i18nT("static.1lemy44")}
                  icon="pi pi-tags"
                  outlined
                  size="small"
                  onClick={() => setTypeVisible(true)}
                />
              )}
              {canCreate && (
                <Button
                  label={i18nT("static.8iwjhx")}
                  icon="pi pi-upload"
                  size="small"
                  onClick={openUpload}
                />
              )}
            </div>
          </div>
          <DataTable
            value={visibleDocuments}
            dataKey="id"
            paginator
            rows={10}
            stripedRows
            rowHover
            size="small"
            emptyMessage={i18nT("static.1jpzkfb")}
          >
            <Column field="employee_name" header={i18nT("static.1fak8xt")} />
            <Column
              field="document_type_name"
              header={i18nT("static.1m2zofh")}
            />
            <Column
              header={i18nT("static.1wvusj8")}
              body={(row: EmployeeDocument) =>
                row.document_name || row.original_file_name || "-"
              }
            />
            <Column
              header={i18nT("static.r38mzi")}
              body={(row: EmployeeDocument) =>
                formatDisplayDate(row.expired_date)
              }
            />
            <Column
              header={i18nT("static.3pd73")}
              body={(row: EmployeeDocument) => (
                <Tag
                  value={
                    row.is_active
                      ? row.verification_status
                      : i18nT("static.dt0j4o")
                  }
                  severity={
                    !row.is_active
                      ? "secondary"
                      : row.verification_status === "VERIFIED"
                        ? "success"
                        : row.verification_status === "REJECTED"
                          ? "danger"
                          : "warning"
                  }
                />
              )}
            />
            <Column
              header={i18nT("static.2wk0tb")}
              body={(row: EmployeeDocument) => (
                <div className="flex gap-1">
                  <Button
                    icon="pi pi-download"
                    text
                    rounded
                    severity="secondary"
                    aria-label={i18nT("static.t8quxl")}
                    tooltip={i18nT("static.t8quxl")}
                    tooltipOptions={{ appendTo: getBody, position: "top" }}
                    disabled={!row.original_file_name}
                    onClick={() =>
                      window.open(
                        `/api/employee-documents/${row.id}/file`,
                        "_blank",
                        "noopener,noreferrer",
                      )
                    }
                  />
                  <Button
                    icon="pi pi-history"
                    text
                    rounded
                    severity="secondary"
                    aria-label={i18nT("static.8kz60b")}
                    tooltip={i18nT("static.8kz60b")}
                    tooltipOptions={{ appendTo: getBody, position: "top" }}
                    onClick={() => setVersionDocument(row)}
                  />
                  {canUpdate && row.is_active && (
                    <Button
                      icon="pi pi-pencil"
                      text
                      rounded
                      severity="secondary"
                      aria-label={i18nT("static.1jfjx2o")}
                      tooltip={i18nT("static.1jfjx2o")}
                      tooltipOptions={{ appendTo: getBody, position: "top" }}
                      onClick={() => openEdit(row)}
                    />
                  )}
                  {canVerify &&
                    row.is_active &&
                    row.verification_status === "PENDING" && (
                      <Button
                        icon="pi pi-check"
                        text
                        rounded
                        aria-label={i18nT("static.cl30w4")}
                        tooltip={i18nT("static.cl30w4")}
                        tooltipOptions={{ appendTo: getBody, position: "top" }}
                        onClick={() => confirmVerify(row)}
                      />
                    )}
                  {canVerify &&
                    row.is_active &&
                    row.verification_status === "PENDING" && (
                      <Button
                        icon="pi pi-times"
                        text
                        rounded
                        severity="danger"
                        aria-label={i18nT("static.1kej36u")}
                        tooltip={i18nT("static.1kej36u")}
                        tooltipOptions={{ appendTo: getBody, position: "top" }}
                        onClick={() => setRejecting(row)}
                      />
                    )}
                  {canUpdate && (
                    <Button
                      icon={row.is_active ? "pi pi-ban" : "pi pi-replay"}
                      text
                      rounded
                      severity={row.is_active ? "danger" : "success"}
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
                      tooltipOptions={{ appendTo: getBody, position: "top" }}
                      onClick={() => confirmActive(row, !row.is_active)}
                    />
                  )}
                </div>
              )}
            />
          </DataTable>
        </div>
      </Card>
      <Dialog
        header={i18nT("static.1bi7d3x")}
        visible={visible}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "42rem" }}
        onHide={() => !saving && setVisible(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label={i18nT("static.ew9em3")}
              text
              severity="secondary"
              onClick={() => setVisible(false)}
            />
            <Button
              label={i18nT("static.106vtz0")}
              icon="pi pi-upload"
              loading={saving}
              onClick={() => void create()}
            />
          </div>
        }
      >
        <div className="grid gap-4 py-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.1fak8xt")}{" "}
            <Dropdown
              value={document.employee_id || null}
              options={employeeOptions}
              filter
              disabled={employeeScoped}
              placeholder={i18nT("static.1izgm0n")}
              className="w-full"
              onChange={(event) =>
                setDocument({ ...document, employee_id: event.value as number })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.1lemy44")}{" "}
            <Dropdown
              value={document.employee_document_type_id || null}
              options={types.filter((item) => item.is_active)}
              optionLabel="name"
              optionValue="id"
              placeholder={i18nT("static.17xxjdy")}
              className="w-full"
              onChange={(event) =>
                setDocument({
                  ...document,
                  employee_document_type_id: event.value as number,
                })
              }
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {i18nT("static.1tnb5t9")}{" "}
              <span className="font-normal text-slate-400">
                {i18nT("static.6pi6gi")}
              </span>
              <InputText
                value={document.document_number}
                onChange={(event) =>
                  setDocument({
                    ...document,
                    document_number: event.target.value,
                  })
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {i18nT("static.1eyzwyf")}{" "}
              <span className="font-normal text-slate-400">
                {i18nT("static.6pi6gi")}
              </span>
              <InputText
                value={document.document_name}
                onChange={(event) =>
                  setDocument({
                    ...document,
                    document_name: event.target.value,
                  })
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {i18nT("static.16dnelc")}{" "}
              <PrimeDatePicker
                value={document.issued_date}
                onValueChange={(value) =>
                  setDocument({ ...document, issued_date: value })
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {i18nT("static.1hrwgce")}{" "}
              <PrimeDatePicker
                value={document.expired_date}
                onValueChange={(value) =>
                  setDocument({ ...document, expired_date: value })
                }
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.bygjtv")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.18vc2s2")}{" "}
            </span>
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.4f76ga")}{" "}
            <InputTextarea
              value={document.notes}
              rows={3}
              autoResize
              onChange={(event) =>
                setDocument({ ...document, notes: event.target.value })
              }
            />
          </label>
        </div>
      </Dialog>
      <Dialog
        header={i18nT("static.hkphuq")}
        visible={typeVisible}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "36rem" }}
        onHide={() => !saving && setTypeVisible(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label={i18nT("static.ew9em3")}
              text
              severity="secondary"
              onClick={() => setTypeVisible(false)}
            />
            <Button
              label={i18nT("static.lewgh4")}
              icon="pi pi-check"
              loading={saving}
              onClick={() => void createType()}
            />
          </div>
        }
      >
        <div className="grid gap-4 py-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.xoaiok")}{" "}
            <InputText
              value={documentType.code}
              onChange={(event) =>
                setDocumentType({ ...documentType, code: event.target.value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.4el6o6")}{" "}
            <InputText
              value={documentType.name}
              onChange={(event) =>
                setDocumentType({ ...documentType, name: event.target.value })
              }
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={documentType.requires_expiry}
              onChange={(event) =>
                setDocumentType({
                  ...documentType,
                  requires_expiry: event.target.checked,
                })
              }
            />{" "}
            {i18nT("static.c53usg")}{" "}
          </label>
          {documentType.requires_expiry && (
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {i18nT("static.1o13bgy")}{" "}
              <InputText
                type="number"
                min="1"
                max="365"
                value={documentType.default_expiry_reminder_days}
                onChange={(event) =>
                  setDocumentType({
                    ...documentType,
                    default_expiry_reminder_days: event.target.value,
                  })
                }
              />
            </label>
          )}
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={documentType.is_required_on_onboarding}
              onChange={(event) =>
                setDocumentType({
                  ...documentType,
                  is_required_on_onboarding: event.target.checked,
                })
              }
            />{" "}
            {i18nT("static.13lxp8y")}{" "}
          </label>
        </div>
      </Dialog>
      <Dialog
        header={
          versionDocument
            ? i18nT("static.w9pi8", {
                p0:
                  versionDocument.document_name ||
                  versionDocument.document_type_name,
              })
            : i18nT("static.14qh7ow")
        }
        visible={versionDocument !== null}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "46rem" }}
        onHide={() => setVersionDocument(null)}
        footer={
          <div className="flex justify-end">
            <Button
              label={i18nT("static.1l0xxoj")}
              text
              severity="secondary"
              onClick={() => setVersionDocument(null)}
            />
          </div>
        }
      >
        <DataTable
          value={fileVersions}
          dataKey="id"
          size="small"
          stripedRows
          loading={versionsLoading}
          emptyMessage={i18nT("static.nxqsxc")}
        >
          <Column
            field="version_number"
            header={i18nT("static.q0zd4n")}
            body={(row: EmployeeDocumentFileVersion) =>
              `v${row.version_number}`
            }
          />
          <Column field="original_file_name" header={i18nT("static.bygjtv")} />
          <Column
            header={i18nT("static.1a4x3zw")}
            body={(row: EmployeeDocumentFileVersion) =>
              `${Math.ceil(row.size_bytes / 1024)} KB`
            }
          />
          <Column
            header={i18nT("static.1cnmmj7")}
            body={(row: EmployeeDocumentFileVersion) =>
              formatDisplayDateTime(row.archived_at)
            }
          />
          <Column
            header={i18nT("static.2wk0tb")}
            body={(row: EmployeeDocumentFileVersion) => (
              <Button
                icon="pi pi-download"
                text
                rounded
                severity="secondary"
                aria-label={i18nT("static.10ja9dt")}
                tooltip={i18nT("static.10ja9dt")}
                tooltipOptions={{ appendTo: getBody, position: "top" }}
                onClick={() =>
                  versionDocument &&
                  window.open(
                    `/api/employee-documents/${versionDocument.id}/versions/${row.id}/file`,
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
              />
            )}
          />
        </DataTable>
      </Dialog>
      <Dialog
        header={i18nT("static.1lq5zhc")}
        visible={editing !== null}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "42rem" }}
        onHide={() => !saving && setEditing(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label={i18nT("static.ew9em3")}
              text
              severity="secondary"
              onClick={() => setEditing(null)}
            />
            <Button
              label={i18nT("static.lewgh4")}
              icon="pi pi-check"
              loading={saving}
              onClick={() => void saveEdit()}
            />
          </div>
        }
      >
        <div className="grid gap-4 py-2 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.1tnb5t9")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.6pi6gi")}
            </span>
            <InputText
              value={editForm.document_number}
              onChange={(event) =>
                setEditForm({
                  ...editForm,
                  document_number: event.target.value,
                })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.1eyzwyf")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.6pi6gi")}
            </span>
            <InputText
              value={editForm.document_name}
              onChange={(event) =>
                setEditForm({ ...editForm, document_name: event.target.value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.16dnelc")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.6pi6gi")}
            </span>
            <PrimeDatePicker
              value={editForm.issued_date}
              onValueChange={(value) =>
                setEditForm({ ...editForm, issued_date: value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.1hrwgce")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.6pi6gi")}
            </span>
            <PrimeDatePicker
              value={editForm.expired_date}
              onValueChange={(value) =>
                setEditForm({ ...editForm, expired_date: value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
            {i18nT("static.1pqoa5f")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.47is3d")}{" "}
            </span>
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              className="block w-full text-sm text-slate-600"
              onChange={(event) =>
                setReplacementFile(event.target.files?.[0] ?? null)
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
            {i18nT("static.4f76ga")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.6pi6gi")}
            </span>
            <InputTextarea
              rows={3}
              autoResize
              value={editForm.notes}
              onChange={(event) =>
                setEditForm({ ...editForm, notes: event.target.value })
              }
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 md:col-span-2">
            <input
              type="checkbox"
              checked={editForm.is_primary}
              onChange={(event) =>
                setEditForm({ ...editForm, is_primary: event.target.checked })
              }
            />{" "}
            {i18nT("static.hb0fa6")}{" "}
          </label>
        </div>
      </Dialog>
      <Dialog
        header={i18nT("static.8n2nin")}
        visible={rejecting !== null}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "32rem" }}
        onHide={() => !saving && setRejecting(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label={i18nT("static.ew9em3")}
              text
              severity="secondary"
              onClick={() => setRejecting(null)}
            />
            <Button
              label={i18nT("static.1kej36u")}
              icon="pi pi-times"
              severity="danger"
              loading={saving}
              onClick={() => {
                if (rejecting) void verify(rejecting, "REJECTED", reason);
              }}
            />
          </div>
        }
      >
        <label className="grid gap-2 py-2 text-sm font-medium text-slate-700">
          {i18nT("static.i36sl5")}{" "}
          <InputTextarea
            value={reason}
            rows={3}
            autoResize
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
      </Dialog>
    </>
  );
}
