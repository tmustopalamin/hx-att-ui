"use client";
import { useI18n } from "@/app/i18n";

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
import {
  formatDate as formatDisplayDate,
  formatDateTime as formatDisplayDateTime,
} from "@/app/utils/date-format";
import { showToast } from "@/store/ToastSlice";
import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputText } from "primereact/inputtext";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import useSWR from "swr";

const ApprovalTableData = () => {
  const { t: i18nT } = useI18n();
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
            tooltip={i18nT("static.ei31dg")}
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
    requestActionConfirmation({
      message: i18nT("static.etfq95"),
      header: i18nT("static.4zf173"),
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
            label={i18nT("static.r5wqai")}
            icon="pi pi-times"
            onClick={options.reject}
            className="p-button-text"
          />
          <Button
            label={i18nT("static.1dudzcg")}
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
          summary: i18nT("static.g72xw0"),
          detail: res.message,
        }),
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: i18nT("static.9bb0pd"),
            detail: getErrorMessage(err, "message"),
          }),
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: i18nT("static.9bb0pd"),
            detail: err.message,
          }),
        );
      }
    }
  };

  const onClickReject = () => {
    requestActionConfirmation({
      message: i18nT("static.vurzx3"),
      header: i18nT("static.1m2qxjf"),
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
            label={i18nT("static.r5wqai")}
            icon="pi pi-times"
            onClick={options.reject}
            className="p-button-text"
          />
          <Button
            label={i18nT("static.1dudzcg")}
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
          summary: i18nT("static.g72xw0"),
          detail: res.message,
        }),
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: i18nT("static.9bb0pd"),
            detail: getErrorMessage(err, "message"),
          }),
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: i18nT("static.9bb0pd"),
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
      <Card title={<CardTitle title={i18nT("static.1ne1rfj")} url="" />}>
        <div className="p-3 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div></div>
            <IconField iconPosition="left">
              <InputIcon className="pi pi-search" />
              <InputText
                className="p-inputtext-sm"
                value={globalFilterValue}
                onChange={onGlobalFilterChange}
                placeholder={i18nT("static.p9ap2o")}
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
            emptyMessage={i18nT("static.1djr4bk")}
            filters={filters}
            currentPageReportTemplate={i18nT("static.1kqh8lr")}
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            loading={approvalTaskLoading}
          >
            <Column
              header="#"
              headerStyle={{ width: "3rem" }}
              body={(data, options) => options.rowIndex + 1}
            />
            <Column field="document_name" header={i18nT("static.1lemy44")} />
            <Column
              field="requester_employee_name"
              header={i18nT("static.uhx31h")}
            />
            <Column field="status" header={i18nT("static.3pd73")} />
            <Column field="approved_by" header={i18nT("static.eph8dj")} />
            <Column
              field="acted_at"
              header={i18nT("static.g3qwy3")}
              body={(row: ApprovalRequestLine) =>
                formatDisplayDateTime(row.acted_at)
              }
            />
            <Column
              headerClassName="bg-white"
              className="bg-white"
              header={i18nT("static.2wk0tb")}
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
                  tooltip={i18nT("static.1kej36u")}
                  rounded
                  severity="danger"
                  label={i18nT("static.1kej36u")}
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
                  tooltip={i18nT("static.1s2ov2y")}
                  rounded
                  severity="success"
                  label={i18nT("static.1s2ov2y")}
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
        {isLoadingDocDetail && <p>{i18nT("static.6kndir")}</p>}
        {errorDocDetail && (
          <p className="text-red-500">{i18nT("static.13jy7ix")}</p>
        )}
        {dataDocDetail && dataDocDetail.document_type_id === 3 && (
          <>
            <div className="grid grid-cols-[180px_1fr] gap-y-2 text-sm">
              <div className="font-semibold text-gray-600">
                {i18nT("static.uhx31h")}
              </div>
              <div>{dataDocDetail.employee_name}</div>

              <div className="font-semibold text-gray-600">
                {i18nT("static.15hph5l")}{" "}
              </div>
              <div>{dataDocDetail.employee_leave_balance_name}</div>

              <div className="font-semibold text-gray-600">
                {i18nT("static.1oxekwz")}
              </div>
              <div>{dataDocDetail.leave_type_name}</div>

              <div className="font-semibold text-gray-600">
                {i18nT("static.7bl5hd")}
              </div>
              <div>{formatDisplayDate(dataDocDetail.start_date)}</div>

              <div className="font-semibold text-gray-600">
                {i18nT("static.1j4m31m")}
              </div>
              <div>{formatDisplayDate(dataDocDetail.end_date)}</div>

              <div className="font-semibold text-gray-600">
                {i18nT("static.141yy28")}
              </div>
              <div>{dataDocDetail.total_days}</div>

              <div className="font-semibold text-gray-600">
                {i18nT("static.i36sl5")}
              </div>
              <div className="break-all whitespace-pre-line">
                {dataDocDetail.reason}
              </div>

              <div className="font-semibold text-gray-600">
                {i18nT("static.3pd73")}
              </div>
              <div>{dataDocDetail.status}</div>

              <div className="font-semibold text-gray-600">
                {i18nT("static.eph8dj")}
              </div>
              <div>{dataDocDetail.approved_by_name}</div>

              <div className="font-semibold text-gray-600">
                {i18nT("static.g3qwy3")}
              </div>
              <div>{formatDisplayDateTime(dataDocDetail.approved_at)}</div>
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
