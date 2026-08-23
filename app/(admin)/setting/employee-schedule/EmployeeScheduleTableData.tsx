"use client";
import { useI18n } from "@/app/i18n";

import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Controller, useForm } from "react-hook-form";
import CardTitle from "@/app/_components/CardTitle";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import { InputSwitch } from "primereact/inputswitch";
import { useState } from "react";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/app/utils/fetcher";
import {
  ResponseType,
  ResponseTypeCreateSuccess,
} from "@/app/types/response-type";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import {
  isResponseTypeError,
  getErrorMessage,
} from "@/app/utils/error-messages";
import { showToast } from "@/store/ToastSlice";
import { useDispatch, useSelector } from "react-redux";
import { Tag } from "primereact/tag";
import { Checkbox } from "primereact/checkbox";
import { RootState } from "@/store/store";
import { useArchivedDataAccess } from "@/app/utils/archived-data-access";
import { Bank } from "@/app/types/bank";
import {
  createBank,
  updateBank,
  deleteBank,
  purgeBank,
  restoreBank,
} from "@/app/services/bank-service";

const EmployeeScheduleTableData = () => {
  const { t: i18nT } = useI18n();
  const dispatch = useDispatch();
  const profileState = useSelector((state: RootState) => state.profile);
  const archivedAccess = useArchivedDataAccess("master-data");
  const [selectedData, setSelectedData] = useState<Bank | null>(null);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState({
    global: { value: "", matchMode: FilterMatchMode.CONTAINS },
  });
  const [isAddNew, setIsAddNew] = useState(false);
  const [visible, setVisible] = useState(false);
  const [popupHeaderTitle, setPopupHeaderTitle] = useState("");
  const {
    control,
    handleSubmit,
    setFocus,
    formState: { isValid },
    reset,
    clearErrors,
  } = useForm<Bank>();
  const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] =
    useState(false);

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const _filters = { ...filters };

    _filters["global"].value = value;

    setFilters(_filters);
    setGlobalFilterValue(value);
  };

  const onClickNew = () => {
    clearErrors();
    setIsAddNew(true);
    setVisible(true);
    setPopupHeaderTitle("New Bank");
    reset({
      id: 0,
      code: "",
      name: "",
      is_active: true,
      deleted_at: "",
      row_version: 0,
    });
  };

  const footerContent = (
    <div className="text-right flex gap-5 justify-end">
      <Button
        type="button"
        label={i18nT("static.ew9em3")}
        icon="pi pi-times"
        onClick={() => {
          setVisible(false);
        }}
        className="p-button-text"
      />
      <Button
        type="submit"
        label={isAddNew ? i18nT("static.hvztxh") : i18nT("static.lewgh4")}
        icon="pi pi-check"
      />
    </div>
  );

  const {
    data: BankData,
    error,
    isLoading,
  } = useSWR<Bank[]>(
    `/api/bank?show_all=${archivedAccess.canShowDeleted && isShowDeletedDataChecked}`,
    fetcher,
  );

  if (isLoading) return <LoadingDataTable />;
  if (error) {
    return (
      <ErrorNotConnectedToApi
        mutateKey={`/api/bank?show_all=${archivedAccess.canShowDeleted && isShowDeletedDataChecked}`}
      />
    );
  }

  const onIngredientsChange = () => {
    setIsShowDeletedDataChecked(!isShowDeletedDataChecked);
  };

  const handleSubmitNew = async (data: Bank) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await createBank(data);
      setVisible(false);
      reset();
      mutate(
        `/api/bank?show_all=${archivedAccess.canShowDeleted && isShowDeletedDataChecked}`,
      );
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

  const handleUpdate = async (data: Bank) => {
    if (!selectedData) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: i18nT("static.9bb0pd"),
          detail: i18nT("static.yiy5uj"),
        }),
      );
      return;
    }

    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await updateBank(
        selectedData.id,
        selectedData.row_version,
        data,
      );

      setVisible(false);
      mutate(
        `/api/bank?show_all=${archivedAccess.canShowDeleted && isShowDeletedDataChecked}`,
      );
      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: i18nT("static.g72xw0"),
          detail: res.message,
        }),
      );
      reset();
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

  const handleDelete = async (data: Bank) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await deleteBank(
        data.id,
        data.row_version,
      );
      setVisible(false);
      reset();
      mutate(
        `/api/bank?show_all=${archivedAccess.canShowDeleted && isShowDeletedDataChecked}`,
      );

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

  const handlePurge = async (data: Bank) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await purgeBank(
        data.id,
      );
      setVisible(false);
      reset();
      mutate(
        `/api/bank?show_all=${archivedAccess.canShowDeleted && isShowDeletedDataChecked}`,
      );

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

  const handleRestore = async (data: Bank) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await restoreBank(
        data.id,
        data.row_version,
      );
      setVisible(false);
      reset();
      mutate(
        `/api/bank?show_all=${archivedAccess.canShowDeleted && isShowDeletedDataChecked}`,
      );

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

  const onSubmit = (data: Bank) => {
    if (!isValid) return;

    if (isAddNew) {
      handleSubmitNew(data);
      return;
    }

    if (selectedData) {
      handleUpdate(data);
    }
  };

  const onClickUpdate = (data: Bank) => {
    setVisible(true);
    setIsAddNew(false);
    setPopupHeaderTitle("Update Bank");

    reset(data);
    setSelectedData(data);
  };

  const activeColumnBody = (rowData: Bank) => {
    return rowData.is_active ? (
      <Tag value={i18nT("static.8qzyhb")} severity="success" />
    ) : (
      <Tag value={i18nT("static.13zf5vc")} severity="danger" />
    );
  };

  const actionColumnBody = (rowData: Bank) => {
    return (
      <>
        <div className="flex gap-2">
          {archivedAccess.canPurge && (
            <Button
              tooltipOptions={{
                appendTo: () => document.body,
                position: "top",
              }}
              tooltip={i18nT("static.m55cx1")}
              rounded
              severity="secondary"
              label=""
              icon="pi pi-times"
              size="small"
              onClick={() => {
                onClickPurge(rowData);
              }}
            />
          )}

          {archivedAccess.canRestore && rowData.deleted_at && (
            <Button
              tooltipOptions={{
                appendTo: () => document.body,
                position: "top",
              }}
              tooltip={i18nT("static.1p9rz69")}
              rounded
              severity="success"
              label=""
              icon="pi pi-refresh"
              size="small"
              onClick={() => {
                onClickRestore(rowData);
              }}
            />
          )}

          {!rowData.deleted_at && (
            <Button
              tooltipOptions={{
                appendTo: () => document.body,
                position: "top",
              }}
              tooltip={i18nT("static.ssf22y")}
              rounded
              severity="danger"
              label=""
              icon="pi pi-trash"
              size="small"
              onClick={() => {
                onClickDelete(rowData);
              }}
            />
          )}

          <Button
            tooltipOptions={{ appendTo: () => document.body, position: "top" }}
            tooltip={i18nT("static.b45n5g")}
            rounded
            severity="help"
            label=""
            icon="pi pi-pencil"
            size="small"
            onClick={() => {
              onClickUpdate(rowData);
            }}
          />
        </div>
      </>
    );
  };

  const onClickDelete = (data: Bank) => {
    requestActionConfirmation({
      message: i18nT("static.bn1ao7"),
      header: i18nT("static.14tdkvz"),
      icon: "pi pi-info-circle",
      defaultFocus: "accept",
      accept: () => {
        setSelectedData(data);
        handleDelete(data);
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
            className="p-button-danger"
          />
        </div>
      ),
    });
  };

  const onClickRestore = (data: Bank) => {
    requestActionConfirmation({
      message: i18nT("static.c06jc4"),
      header: i18nT("static.j6hscu"),
      icon: "pi pi-info-circle",
      defaultFocus: "accept",
      accept: () => {
        setSelectedData(data);
        handleRestore(data);
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

  const onClickPurge = (data: Bank) => {
    requestActionConfirmation({
      message: i18nT("static.1umz31y"),
      header: i18nT("static.14tdkvz"),
      icon: "pi pi-info-circle",
      defaultFocus: "accept",
      accept: () => {
        handlePurge(data);
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
            className="p-button-danger"
          />
        </div>
      ),
    });
  };

  return (
    <>
      <Card title={<CardTitle title={i18nT("static.192q8xj")} url="" />}>
        <div className="p-3 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button
                label={i18nT("static.12ludo1")}
                icon="pi pi-plus"
                size="small"
                onClick={() => {
                  onClickNew();
                }}
              />

              {archivedAccess.canShowDeleted && (
                <div className="flex align-items-center pl-5">
                  <Checkbox
                    inputId="showDeletedData"
                    name="showDeletedData"
                    value="yes"
                    onChange={onIngredientsChange}
                    checked={isShowDeletedDataChecked}
                  />
                  <label htmlFor="showDeletedData" className="ml-2">
                    {i18nT("static.1s8ywez")}{" "}
                  </label>
                </div>
              )}
            </div>

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
            value={BankData}
            tableStyle={{ minWidth: "50rem" }}
            stripedRows
            paginator
            scrollable
            scrollHeight="500px"
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            dataKey="id"
            globalFilterFields={["name"]}
            emptyMessage={i18nT("static.17lkhli")}
            header={<></>}
            filters={filters}
            currentPageReportTemplate={i18nT("static.1kqh8lr")}
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            loading={isLoading}
          >
            <Column
              header="#"
              headerStyle={{ width: "3rem" }}
              body={(data, options) => options.rowIndex + 1}
            ></Column>
            <Column field="code" header={i18nT("static.xoaiok")}></Column>
            <Column field="name" header={i18nT("static.4el6o6")}></Column>
            <Column
              field="is_active"
              header={i18nT("static.8qzyhb")}
              body={activeColumnBody}
            ></Column>
            <Column
              headerClassName="bg-white"
              className="bg-white"
              header={i18nT("static.2wk0tb")}
              body={(rowData) => actionColumnBody(rowData)}
              frozen={true}
              alignFrozen="right"
            ></Column>
          </DataTable>
        </div>
      </Card>

      <form onSubmit={handleSubmit((data) => onSubmit(data))}>
        <Dialog
          header={popupHeaderTitle}
          visible={visible}
          style={{ width: "50vw" }}
          onHide={() => {
            if (!visible) return;
            setVisible(false);
            reset();
          }}
          footer={footerContent}
          onShow={() => {
            setFocus("name");
          }}
        >
          <div className="flex flex-col gap-5">
            <div className="m-0 flex flex-col gap-2">
              <label htmlFor="code">{i18nT("static.xoaiok")}</label>
              <Controller
                name="code"
                control={control}
                rules={{
                  required: i18nT("static.1lf34iw"),
                  validate: (value) =>
                    !/\s/.test(value) || "must not contain spaces.",
                  maxLength: { value: 50, message: i18nT("static.qf28bp") },
                }}
                render={({ field, fieldState }) => (
                  <>
                    <InputText
                      id="code"
                      placeholder={i18nT("static.1q0sleu")}
                      {...field}
                      className={fieldState.invalid ? "p-invalid" : ""}
                    />
                    {fieldState.error && (
                      <small className="font-bold p-error">
                        {" "}
                        {fieldState.error.message}{" "}
                      </small>
                    )}
                  </>
                )}
              />
            </div>

            <div className="m-0 flex flex-col gap-2">
              <label htmlFor="name">{i18nT("static.4el6o6")}</label>
              <Controller
                name="name"
                control={control}
                rules={{
                  required: i18nT("static.1lf34iw"),
                  maxLength: { value: 50, message: i18nT("static.qf28bp") },
                }}
                render={({ field, fieldState }) => (
                  <>
                    <InputText
                      id="name"
                      placeholder={i18nT("static.1lyet2t")}
                      {...field}
                      className={fieldState.invalid ? "p-invalid" : ""}
                    />
                    {fieldState.error && (
                      <small className="font-bold p-error">
                        {" "}
                        {fieldState.error.message}{" "}
                      </small>
                    )}
                  </>
                )}
              />
            </div>

            <div className="m-0 flex flex-col gap-2">
              <label htmlFor="is_active">{i18nT("static.8qzyhb")}</label>
              <Controller
                name="is_active"
                control={control}
                defaultValue={true}
                render={({ field }) => (
                  <InputSwitch
                    id="is_active"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.value)}
                  />
                )}
              />
            </div>
          </div>
        </Dialog>
      </form>
    </>
  );
};

export default EmployeeScheduleTableData;
