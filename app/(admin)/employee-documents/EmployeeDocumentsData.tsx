"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Tag } from "primereact/tag";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";
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

export default function EmployeeDocumentsData() {
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const permissions = useSelector(
    (state: RootState) => state.profile.permissions,
  );
  const canCreate = permissions.includes("employee-document.create");
  const canUpdate = permissions.includes("employee-document.update");
  const canVerify = permissions.includes("employee-document.verify");
  const { data: types = [], mutate: reloadTypes } = useSWR(
    "employee-document-types",
    getEmployeeDocumentTypes,
  );
  const {
    data: documents = [],
    mutate: reloadDocuments,
    isValidating,
  } = useSWR("employee-documents", () => getEmployeeDocuments());
  const { data: employees = [] } = useSWR<Employee[]>(
    "/api/employees/list?show_all=false",
    fetcher,
  );
  const selectedEmployeeId = Number(searchParams.get("employee_id"));
  const employeeScoped =
    Number.isSafeInteger(selectedEmployeeId) && selectedEmployeeId > 0;
  const visibleDocuments = useMemo(
    () =>
      employeeScoped
        ? documents.filter((item) => item.employee_id === selectedEmployeeId)
        : documents,
    [documents, employeeScoped, selectedEmployeeId],
  );
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
          employee.full_name || `${employee.first_name} ${employee.last_name}`,
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

  const createType = async () => {
    if (!documentType.code.trim() || !documentType.name.trim()) {
      toast("error", "Validation", "Code and name are required.");
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
      toast("success", "Saved", "Employee document type created.");
    } catch {
      toast("error", "Unable to save", "Document type could not be created.");
    } finally {
      setSaving(false);
    }
  };
  const create = async () => {
    if (!document.employee_id || !document.employee_document_type_id || !file) {
      toast(
        "error",
        "Validation",
        "Employee, document type, and file are required.",
      );
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
      toast("success", "Uploaded", "Document is ready for verification.");
    } catch {
      toast(
        "error",
        "Unable to upload",
        "Use a valid PDF, PNG, or JPEG file up to 10 MB.",
      );
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
        "Updated",
        status === "VERIFIED" ? "Document verified." : "Document rejected.",
      );
    } catch {
      toast("error", "Unable to update", "Refresh the document and try again.");
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
      toast(
        "success",
        "Updated",
        "Document metadata and verification status were updated.",
      );
    } catch {
      toast(
        "error",
        "Unable to update",
        "Refresh the document and verify dates or file format.",
      );
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
        "Updated",
        isActive ? "Document activated." : "Document deactivated.",
      );
    } catch {
      toast(
        "error",
        "Unable to update",
        "Document changed. Refresh and try again.",
      );
    } finally {
      setSaving(false);
    }
  };
  const confirmActive = (row: EmployeeDocument, isActive: boolean) =>
    confirmDialog({
      header: isActive ? "Activate Document" : "Deactivate Document",
      message: isActive
        ? "Activate this document?"
        : "Deactivate this document? It will no longer satisfy onboarding requirements.",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: isActive ? "Activate" : "Deactivate",
      rejectLabel: "Cancel",
      acceptClassName: isActive ? undefined : "p-button-danger",
      accept: () => void changeActive(row, isActive),
    });

  return (
    <>
      <ConfirmDialog />
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="m-0 text-xl font-semibold text-slate-800 sm:text-2xl">
                Employee Documents
              </h1>
              <p className="m-0 mt-1 text-sm text-slate-500">
                Securely store, verify, and monitor employee documents.
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
              {canUpdate && (
                <Button
                  label="Document Type"
                  icon="pi pi-tags"
                  outlined
                  size="small"
                  onClick={() => setTypeVisible(true)}
                />
              )}
              {canCreate && (
                <Button
                  label="Upload Document"
                  icon="pi pi-upload"
                  size="small"
                  onClick={() => setVisible(true)}
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
            emptyMessage="No employee document found."
          >
            <Column field="employee_name" header="Employee" />
            <Column field="document_type_name" header="Type" />
            <Column
              header="Document"
              body={(row: EmployeeDocument) =>
                row.document_name || row.original_file_name || "-"
              }
            />
            <Column
              header="Expiry"
              body={(row: EmployeeDocument) => row.expired_date || "-"}
            />
            <Column
              header="Status"
              body={(row: EmployeeDocument) => (
                <Tag
                  value={row.is_active ? row.verification_status : "INACTIVE"}
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
              header="Action"
              body={(row: EmployeeDocument) => (
                <div className="flex gap-1">
                  <Button
                    icon="pi pi-download"
                    text
                    rounded
                    severity="secondary"
                    aria-label="Download"
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
                    aria-label="File version history"
                    onClick={() => setVersionDocument(row)}
                  />
                  {canUpdate && row.is_active && (
                    <Button
                      icon="pi pi-pencil"
                      text
                      rounded
                      severity="secondary"
                      aria-label="Edit or replace file"
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
                        aria-label="Verify"
                        onClick={() => void verify(row, "VERIFIED")}
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
                        aria-label="Reject"
                        onClick={() => setRejecting(row)}
                      />
                    )}
                  {canUpdate && (
                    <Button
                      icon={row.is_active ? "pi pi-ban" : "pi pi-replay"}
                      text
                      rounded
                      severity={row.is_active ? "danger" : "success"}
                      aria-label={row.is_active ? "Deactivate" : "Activate"}
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
        header="Upload Employee Document"
        visible={visible}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "42rem" }}
        onHide={() => !saving && setVisible(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Cancel"
              text
              severity="secondary"
              onClick={() => setVisible(false)}
            />
            <Button
              label="Upload"
              icon="pi pi-upload"
              loading={saving}
              onClick={() => void create()}
            />
          </div>
        }
      >
        <div className="grid gap-4 py-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Employee
            <Dropdown
              value={document.employee_id || null}
              options={employeeOptions}
              filter
              placeholder="Select employee"
              className="w-full"
              onChange={(event) =>
                setDocument({ ...document, employee_id: event.value as number })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Document Type
            <Dropdown
              value={document.employee_document_type_id || null}
              options={types.filter((item) => item.is_active)}
              optionLabel="name"
              optionValue="id"
              placeholder="Select document type"
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
              Document Number{" "}
              <span className="font-normal text-slate-400">(optional)</span>
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
              Document Name{" "}
              <span className="font-normal text-slate-400">(optional)</span>
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
              Issued Date{" "}
              <InputText
                type="date"
                value={document.issued_date}
                onChange={(event) =>
                  setDocument({ ...document, issued_date: event.target.value })
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Expiry Date{" "}
              <InputText
                type="date"
                value={document.expired_date}
                onChange={(event) =>
                  setDocument({ ...document, expired_date: event.target.value })
                }
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            File{" "}
            <span className="font-normal text-slate-400">
              (PDF, PNG, JPEG; max 10 MB)
            </span>
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Notes{" "}
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
        header="Employee Document Type"
        visible={typeVisible}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "36rem" }}
        onHide={() => !saving && setTypeVisible(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Cancel"
              text
              severity="secondary"
              onClick={() => setTypeVisible(false)}
            />
            <Button
              label="Save"
              icon="pi pi-check"
              loading={saving}
              onClick={() => void createType()}
            />
          </div>
        }
      >
        <div className="grid gap-4 py-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Code
            <InputText
              value={documentType.code}
              onChange={(event) =>
                setDocumentType({ ...documentType, code: event.target.value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Name
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
            Requires expiry date
          </label>
          {documentType.requires_expiry && (
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Reminder Days
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
            Required on onboarding
          </label>
        </div>
      </Dialog>
      <Dialog
        header={
          versionDocument
            ? `File Versions — ${versionDocument.document_name || versionDocument.document_type_name}`
            : "File Versions"
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
              label="Close"
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
          emptyMessage="No archived file version found."
        >
          <Column
            field="version_number"
            header="Version"
            body={(row: EmployeeDocumentFileVersion) =>
              `v${row.version_number}`
            }
          />
          <Column field="original_file_name" header="File" />
          <Column
            header="Size"
            body={(row: EmployeeDocumentFileVersion) =>
              `${Math.ceil(row.size_bytes / 1024)} KB`
            }
          />
          <Column
            header="Archived"
            body={(row: EmployeeDocumentFileVersion) =>
              new Date(row.archived_at).toLocaleString()
            }
          />
          <Column
            header="Action"
            body={(row: EmployeeDocumentFileVersion) => (
              <Button
                icon="pi pi-download"
                text
                rounded
                severity="secondary"
                aria-label="Download archived version"
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
        header="Edit Employee Document"
        visible={editing !== null}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "42rem" }}
        onHide={() => !saving && setEditing(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Cancel"
              text
              severity="secondary"
              onClick={() => setEditing(null)}
            />
            <Button
              label="Save"
              icon="pi pi-check"
              loading={saving}
              onClick={() => void saveEdit()}
            />
          </div>
        }
      >
        <div className="grid gap-4 py-2 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Document Number{" "}
            <span className="font-normal text-slate-400">(optional)</span>
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
            Document Name{" "}
            <span className="font-normal text-slate-400">(optional)</span>
            <InputText
              value={editForm.document_name}
              onChange={(event) =>
                setEditForm({ ...editForm, document_name: event.target.value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Issued Date{" "}
            <span className="font-normal text-slate-400">(optional)</span>
            <InputText
              type="date"
              value={editForm.issued_date}
              onChange={(event) =>
                setEditForm({ ...editForm, issued_date: event.target.value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Expiry Date{" "}
            <span className="font-normal text-slate-400">(optional)</span>
            <InputText
              type="date"
              value={editForm.expired_date}
              onChange={(event) =>
                setEditForm({ ...editForm, expired_date: event.target.value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
            Replacement File{" "}
            <span className="font-normal text-slate-400">
              (optional; PDF, PNG, JPEG; max 10 MB)
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
            Notes <span className="font-normal text-slate-400">(optional)</span>
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
            Primary document
          </label>
        </div>
      </Dialog>
      <Dialog
        header="Reject Document"
        visible={rejecting !== null}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "32rem" }}
        onHide={() => !saving && setRejecting(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Cancel"
              text
              severity="secondary"
              onClick={() => setRejecting(null)}
            />
            <Button
              label="Reject"
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
          Reason
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
