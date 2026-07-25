"use client";

import dayjs from "dayjs";
import { useState } from "react";
import useSWR, { mutate } from "swr";
import { useDispatch } from "react-redux";

import { Card } from "primereact/card";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputTextarea } from "primereact/inputtextarea";
import { confirmDialog, ConfirmDialog } from "primereact/confirmdialog";

import LoadingDataTable from "@/app/_components/LoadingDataTable";
import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import { fetcher } from "@/app/utils/fetcher";
import {
  isResponseTypeError,
  getErrorMessage,
} from "@/app/utils/error-messages";
import { showToast } from "@/store/ToastSlice";
import { OvertimeRequest } from "@/app/types/overtime-request";
import {
  approveOvertimeManagement,
  rejectOvertimeManagement,
} from "@/app/services/overtime-management-service";

const API_KEY = "/api/overtime-management?show_all=false";

const formatDuration = (seconds: number) => {
  const safeSeconds = Number(seconds || 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  return `${hours}h ${minutes}m`;
};

const OvertimeManagementTableData = () => {
  const dispatch = useDispatch();

  const [rejectDialogVisible, setRejectDialogVisible] = useState(false);
  const [selectedData, setSelectedData] = useState<OvertimeRequest | null>(
    null,
  );
  const [rejectNote, setRejectNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { data, error, isLoading } = useSWR<OvertimeRequest[]>(
    API_KEY,
    fetcher,
  );

  const refreshData = async () => {
    await mutate(API_KEY);
  };

  const showErrorToast = (err: unknown) => {
    if (isResponseTypeError(err)) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Error",
          detail: getErrorMessage(err, "message"),
        }),
      );
    } else if (err instanceof Error) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Error",
          detail: err.message,
        }),
      );
    }
  };

  const statusBody = (row: OvertimeRequest) => {
    const status = row.status?.toUpperCase();

    if (status === "APPROVED") {
      return <Tag value="APPROVED" severity="success" />;
    }

    if (status === "REJECTED") {
      return <Tag value="REJECTED" severity="danger" />;
    }

    if (status === "CANCELLED") {
      return <Tag value="CANCELLED" severity="warning" />;
    }

    return <Tag value={status || "PENDING"} severity="info" />;
  };

  const dateBody = (value?: string | null) => {
    if (!value) return "-";
    return dayjs(value).format("DD-MM-YYYY");
  };

  const timeBody = (value?: string | null) => {
    if (!value) return "-";
    return dayjs(value).format("HH:mm");
  };

  const dateTimeBody = (value?: string | null) => {
    if (!value) return "-";
    return dayjs(value).format("DD-MM-YYYY HH:mm");
  };

  const handleApprove = async (row: OvertimeRequest) => {
    try {
      setIsSaving(true);

      const res = await approveOvertimeManagement(
        row.id,
        row.row_version,
        "Approved manually by admin",
      );

      await refreshData();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res.message || "Overtime approved successfully.",
        }),
      );
    } catch (err: unknown) {
      showErrorToast(err);
    } finally {
      setIsSaving(false);
    }
  };

  const onClickApprove = (row: OvertimeRequest) => {
    confirmDialog({
      message: "Approve this overtime request manually?",
      header: "Approve Confirmation",
      icon: "pi pi-info-circle",
      accept: () => handleApprove(row),
    });
  };

  const onClickReject = (row: OvertimeRequest) => {
    setSelectedData(row);
    setRejectNote("");
    setRejectDialogVisible(true);
  };

  const handleReject = async () => {
    if (!selectedData) return;

    const cleanNote = rejectNote.trim();

    if (!cleanNote) {
      dispatch(
        showToast({
          visible: true,
          severity: "warn",
          summary: "Validation",
          detail: "Rejection reason is required.",
        }),
      );
      return;
    }

    try {
      setIsSaving(true);

      const res = await rejectOvertimeManagement(
        selectedData.id,
        selectedData.row_version,
        cleanNote,
      );

      await refreshData();

      setRejectDialogVisible(false);
      setSelectedData(null);
      setRejectNote("");

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res.message || "Overtime rejected successfully.",
        }),
      );
    } catch (err: unknown) {
      showErrorToast(err);
    } finally {
      setIsSaving(false);
    }
  };

  const actionBody = (row: OvertimeRequest) => {
    const isPending = row.status?.toUpperCase() === "PENDING";

    if (!isPending) {
      return <span className="text-sm text-slate-400">No action</span>;
    }

    return (
      <div className="flex gap-2">
        <Button
          icon="pi pi-check"
          rounded
          size="small"
          severity="success"
          tooltip="Approve"
          disabled={isSaving}
          onClick={() => onClickApprove(row)}
        />
        <Button
          icon="pi pi-times"
          rounded
          size="small"
          severity="danger"
          tooltip="Reject"
          disabled={isSaving}
          onClick={() => onClickReject(row)}
        />
      </div>
    );
  };

  if (isLoading) return <LoadingDataTable />;
  if (error) return <ErrorNotConnectedToApi mutateKey={API_KEY} />;

  return (
    <>
      <ConfirmDialog />

      <Card>
        <div className="flex flex-col gap-4 p-4">
          <div className="border-b pb-3">
            <h1 className="text-2xl font-semibold text-slate-800">
              Overtime Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Review all employee overtime requests and perform manual admin
              approval or rejection.
            </p>
          </div>

          <DataTable
            value={data ?? []}
            paginator
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            stripedRows
            scrollable
            scrollHeight="520px"
            tableStyle={{ minWidth: "88rem" }}
            dataKey="id"
            emptyMessage="No overtime request found."
          >
            <Column
              header="#"
              body={(_, opt) => opt.rowIndex + 1}
              style={{ width: "4rem" }}
            />
            <Column
              field="employee_name"
              header="Employee Name"
              style={{ minWidth: "15rem" }}
            />
            <Column
              header="Date"
              body={(row) => dateBody(row.overtime_date)}
              style={{ minWidth: "10rem" }}
            />
            <Column
              header="Start"
              body={(row) => timeBody(row.requested_start_at)}
              style={{ minWidth: "8rem" }}
            />
            <Column
              header="End"
              body={(row) => timeBody(row.requested_end_at)}
              style={{ minWidth: "8rem" }}
            />
            <Column
              header="Duration"
              body={(row) => formatDuration(row.requested_seconds)}
              style={{ minWidth: "9rem" }}
            />
            <Column
              header="Status"
              body={statusBody}
              style={{ minWidth: "10rem" }}
            />
            <Column
              field="reason"
              header="Reason"
              style={{ minWidth: "18rem" }}
            />
            <Column
              field="rejection_reason"
              header="Reject Reason"
              style={{ minWidth: "18rem" }}
            />
            <Column
              field="approved_by_name"
              header="Approved By"
              style={{ minWidth: "14rem" }}
            />
            <Column
              header="Approved At"
              body={(row) => dateTimeBody(row.approved_at)}
              style={{ minWidth: "12rem" }}
            />
            <Column
              header="Submitted At"
              body={(row) => dateTimeBody(row.submitted_at)}
              style={{ minWidth: "12rem" }}
            />
            <Column
              header="Action"
              body={actionBody}
              frozen
              alignFrozen="right"
              style={{ minWidth: "9rem" }}
              headerStyle={{ background: "#fff", zIndex: 1 }}
              bodyStyle={{ background: "#fff" }}
            />
          </DataTable>
        </div>
      </Card>

      <Dialog
        header="Reject Overtime Request"
        visible={rejectDialogVisible}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "520px" }}
        onHide={() => setRejectDialogVisible(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Cancel"
              icon="pi pi-times"
              className="p-button-text"
              disabled={isSaving}
              onClick={() => setRejectDialogVisible(false)}
            />
            <Button
              label="Reject"
              icon={isSaving ? "pi pi-spin pi-spinner" : "pi pi-check"}
              severity="danger"
              disabled={isSaving}
              onClick={handleReject}
            />
          </div>
        }
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="rejectNote" className="font-medium">
            Rejection Reason
          </label>
          <InputTextarea
            id="rejectNote"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            rows={5}
            autoResize
            className="w-full"
            placeholder="Enter rejection reason"
          />
        </div>
      </Dialog>
    </>
  );
};

export default OvertimeManagementTableData;
