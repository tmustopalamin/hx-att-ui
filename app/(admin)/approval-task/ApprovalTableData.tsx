"use client";

import CardTitle from "@/app/_components/CardTitle";
import useGetDocumentDetailApproval from "@/app/hooks/use-get-document-detail-approval";
import { ApprovalRequestLine } from "@/app/types/approval-request-line";
import {
  ResponseType,
  ResponseTypeCreateSuccess,
} from "@/app/types/response-type";
import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { fetcher } from "@/app/utils/fetcher";
import { showToast } from "@/store/ToastSlice";
import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputText } from "primereact/inputtext";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import useSWR from "swr";

const ApprovalTableData = () => {
  const [selectedDocId, setSelectedDoc] = useState<number>();
  const {
    data: dataDocDetail,
    error: errorDocDetail,
    isLoading: isLoadingDocDetail,
    mutate: mutateDocDetail,
  } = useGetDocumentDetailApproval(selectedDocId);

  const dispatch = useDispatch();
  const [visible, setVisible] = useState(false);
  const [popupHeaderTitle, setPopupHeaderTitle] = useState("");
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState({
    global: { value: "", matchMode: FilterMatchMode.CONTAINS },
  });
  const [selectedData, setSelectedData] = useState<ApprovalRequestLine | null>(
    null,
  );
  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const _filters = { ...filters };

    _filters["global"].value = value;

    setFilters(_filters);
    setGlobalFilterValue(value);
  };

  const actionApproveColumnBody = (rowData: ApprovalRequestLine) => {
    return (
      <>
        <div className="flex gap-2">
          <Button
            tooltipOptions={{ appendTo: () => document.body, position: "top" }}
            tooltip="Detail"
            rounded
            severity="info"
            label=""
            icon="pi pi-search"
            size="small"
            onClick={() => {
              onClickDetail(rowData);
            }}
          />
        </div>
      </>
    );
  };

  const onClickDetail = (data: ApprovalRequestLine) => {
    setSelectedDoc(data.approval_request_id);
    setVisible(true);
    setPopupHeaderTitle("Detail Approval");
    setSelectedData(data);
  };

  const onClickApprove = () => {
    confirmDialog({
      message: "Do you want to approve this record?",
      header: "Approve Confirmation",
      icon: "pi pi-info-circle",
      defaultFocus: "accept",
      accept: () => {
        if (selectedData) {
          handleApprove(selectedData);
        }
      },
      reject: () => {},
      footer: (options) => (
        <div className="flex gap-3 justify-end">
          <Button
            label="No"
            icon="pi pi-times"
            onClick={options.reject}
            className="p-button-text"
          />
          <Button
            label="Yes"
            icon="pi pi-check"
            onClick={options.accept}
            className="p-button-success"
          />
        </div>
      ),
    });
  };

  const handleApprove = async (data: ApprovalRequestLine) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await approveAction(data);
      setVisible(false);
      mutateDocDetail();
      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "success",
          detail: res.message,
        }),
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "error",
            detail: getErrorMessage(err, "message"),
          }),
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "error",
            detail: err.message,
          }),
        );
      }
    }
  };

  const onClickReject = () => {
    confirmDialog({
      message: "Do you want to reject this record?",
      header: "Reject Confirmation",
      icon: "pi pi-info-circle",
      defaultFocus: "accept",
      accept: () => {
        if (selectedData) {
          handleReject(selectedData);
        }
      },
      reject: () => {},
      footer: (options) => (
        <div className="flex gap-3 justify-end">
          <Button
            label="No"
            icon="pi pi-times"
            onClick={options.reject}
            className="p-button-text"
          />
          <Button
            label="Yes"
            icon="pi pi-check"
            onClick={options.accept}
            className="p-button-success"
          />
        </div>
      ),
    });
  };

  const handleReject = async (data: ApprovalRequestLine) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await rejectAction(data);
      setVisible(false);
      mutateDocDetail();
      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "success",
          detail: res.message,
        }),
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "error",
            detail: getErrorMessage(err, "message"),
          }),
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "error",
            detail: err.message,
          }),
        );
      }
    }
  };

  const {
    data: approvalTaskData,
    error: approvalTaskError,
    isLoading: approvalTaskLoading,
  } = useSWR<ApprovalRequestLine[]>(`/api/approval/approval-task`, fetcher);

  return (
    <>
      <ConfirmDialog />
      <Card title={<CardTitle title="Approval Task" url="" />}>
        <div className="p-3 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div></div>
            <IconField iconPosition="left">
              <InputIcon className="pi pi-search" />
              <InputText
                className="p-inputtext-sm"
                value={globalFilterValue}
                onChange={onGlobalFilterChange}
                placeholder="Keyword Search"
              />
            </IconField>
          </div>

          <DataTable
            value={approvalTaskError ? [] : approvalTaskData}
            tableStyle={{ minWidth: "50rem" }}
            stripedRows
            paginator
            scrollable
            scrollHeight="500px"
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            dataKey="id"
            globalFilterFields={["document_name"]}
            emptyMessage="No approval task found."
            filters={filters}
            currentPageReportTemplate="{first} to {last} of {totalRecords}"
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            loading={approvalTaskLoading}
          >
            <Column
              header="#"
              headerStyle={{ width: "3rem" }}
              body={(data, options) => options.rowIndex + 1}
            />
            <Column field="document_name" header="Document Type" />
            <Column field="requester_employee_name" header="Requester" />
            <Column field="status" header="Status" />
            <Column field="approved_by" header="Approved By" />
            <Column field="approved_at" header="Approved At" />
            <Column
              headerClassName="bg-white"
              className="bg-white"
              header="Action"
              body={(rowData) => actionApproveColumnBody(rowData)}
              frozen={true}
              alignFrozen="right"
            />
          </DataTable>
        </div>
      </Card>

      <Dialog
        header={popupHeaderTitle}
        visible={visible}
        className="w-[90%] md:w-[60%] lg:w-[50%] xl:w-[40%]"
        onHide={() => {
          if (!visible) return;
          setVisible(false);
        }}
        footer={() => {
          return (
            <>
              <div className="flex gap-2 justify-end">
                <Button
                  tooltipOptions={{
                    appendTo: () => document.body,
                    position: "top",
                  }}
                  tooltip="Reject"
                  rounded
                  severity="danger"
                  label="Reject"
                  icon="pi pi-times"
                  size="small"
                  onClick={() => {
                    onClickReject();
                  }}
                />

                <Button
                  tooltipOptions={{
                    appendTo: () => document.body,
                    position: "top",
                  }}
                  tooltip="Approve"
                  rounded
                  severity="success"
                  label="Approve"
                  icon="pi pi-check"
                  size="small"
                  onClick={() => {
                    onClickApprove();
                  }}
                />
              </div>
            </>
          );
        }}
      >
        {isLoadingDocDetail && <p>Loading...</p>}
        {errorDocDetail && <p className="text-red-500">Error fetching data</p>}
        {dataDocDetail && dataDocDetail.document_type_id === 3 && (
          <>
            <div className="grid grid-cols-[180px_1fr] gap-y-2 text-sm">
              <div className="font-semibold text-gray-600">Requester</div>
              <div>{dataDocDetail.employee_name}</div>

              <div className="font-semibold text-gray-600">
                Leave Balance Used
              </div>
              <div>{dataDocDetail.employee_leave_balance_name}</div>

              <div className="font-semibold text-gray-600">Leave Name</div>
              <div>{dataDocDetail.leave_type_name}</div>

              <div className="font-semibold text-gray-600">Start Date</div>
              <div>{dataDocDetail.start_date}</div>

              <div className="font-semibold text-gray-600">End Date</div>
              <div>{dataDocDetail.end_date}</div>

              <div className="font-semibold text-gray-600">Total Days</div>
              <div>{dataDocDetail.total_days}</div>

              <div className="font-semibold text-gray-600">Reason</div>
              <div className="break-all whitespace-pre-line">
                {dataDocDetail.reason}
              </div>

              <div className="font-semibold text-gray-600">Status</div>
              <div>{dataDocDetail.status}</div>

              <div className="font-semibold text-gray-600">Approved By</div>
              <div>{dataDocDetail.approved_by_name}</div>

              <div className="font-semibold text-gray-600">Approved At</div>
              <div>{dataDocDetail.approved_at}</div>
            </div>
          </>
        )}
      </Dialog>
    </>
  );
};

export default ApprovalTableData;
function approveAction(
  data: ApprovalRequestLine,
):
  | ResponseType<ResponseTypeCreateSuccess>
  | PromiseLike<ResponseType<ResponseTypeCreateSuccess>> {
  throw new Error("Function not implemented.");
}

function rejectAction(
  data: ApprovalRequestLine,
):
  | ResponseType<ResponseTypeCreateSuccess>
  | PromiseLike<ResponseType<ResponseTypeCreateSuccess>> {
  throw new Error("Function not implemented.");
}
