"use client";

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
import { confirmDialog, ConfirmDialog } from "primereact/confirmdialog";
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
import { hasRole } from "@/app/utils/role-utils";
import { IncomeComponent } from "@/app/types/income-component";
import {
  createIncomeComponent,
  updateIncomeComponent,
  deleteIncomeComponent,
  purgeIncomeComponent,
  restoreIncomeComponent,
} from "@/app/services/income-component-service";
import { CalculationMethod } from "@/app/types/calculation-method";
import { Dropdown } from "primereact/dropdown";
import { PayrollFormula } from "@/app/types/payroll-formula";
import { ComponentCategory } from "@/app/types/component-category";

const IncomeComponentTableData = () => {
  const dispatch = useDispatch();
  const profileState = useSelector((state: RootState) => state.profile);
  const [selectedData, setSelectedData] = useState<IncomeComponent | null>(
    null,
  );
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
    watch,
  } = useForm<IncomeComponent>();
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
    setPopupHeaderTitle("New Income Component");
    reset({
      id: 0,
      code: "",
      name: "",
      is_taxable: false,
      calculation_method: 0,
      formula_id: null,
      category: 0,
      is_active: true,
      deleted_at: "",
      row_version: 0,
    });
  };

  const footerContent = (
    <div className="text-right flex gap-5 justify-end">
      <Button
        type="button"
        label="Cancel"
        icon="pi pi-times"
        onClick={() => {
          setVisible(false);
        }}
        className="p-button-text"
      />
      <Button
        type="submit"
        label={isAddNew ? "Submit" : "Save"}
        icon="pi pi-check"
      />
    </div>
  );

  const {
    data: IncomeComponentData,
    error,
    isLoading,
  } = useSWR<IncomeComponent[]>(
    `/api/income-component?show_all=${isShowDeletedDataChecked}`,
    fetcher,
  );
  const {
    data: calculationMethodData,
    error: calculationMethodError,
    isLoading: calculationMethodIsLoading,
  } = useSWR<CalculationMethod[]>(`/api/calculation-method`, fetcher);
  const {
    data: dataFormula,
    error: errorFormula,
    isLoading: isLoadingFormula,
  } = useSWR<PayrollFormula[]>(`/api/payroll-formula`, fetcher);
  const {
    data: dataComponentCategory,
    error: errorComponentCategory,
    isLoading: isLoadingComponentCategory,
  } = useSWR<ComponentCategory[]>(`/api/component-category`, fetcher);
  const calculationMethodActive = calculationMethodData?.filter(
    (a) => a.is_active,
  );
  const activeFormula = dataFormula?.filter((a) => a.is_active);
  const activeComponentCategory = dataComponentCategory?.filter(
    (a) => a.is_active && a.category_type === "income",
  );

  if (isLoading) return <LoadingDataTable />;
  if (error) {
    return (
      <ErrorNotConnectedToApi mutateKey="/api/income-component?show_all=true" />
    );
  }

  const onIngredientsChange = () => {
    setIsShowDeletedDataChecked(!isShowDeletedDataChecked);
  };

  const handleSubmitNew = async (data: IncomeComponent) => {
    if (watch("calculation_method") !== 4) {
      data.formula_id = null;
    }

    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await createIncomeComponent(data);
      setVisible(false);
      reset();
      mutate(`/api/income-component?show_all=${isShowDeletedDataChecked}`);
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

  const handleUpdate = async (data: IncomeComponent) => {
    if (!selectedData) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "error",
          detail: "please select data",
        }),
      );
      return;
    }

    if (watch("calculation_method") !== 4) {
      data.formula_id = null;
    }

    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await updateIncomeComponent(
          selectedData.id,
          selectedData.row_version,
          data,
        );

      setVisible(false);
      mutate(`/api/income-component?show_all=${isShowDeletedDataChecked}`);
      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "success",
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

  const handleDelete = async (data: IncomeComponent) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await deleteIncomeComponent(data.id, data.row_version);
      setVisible(false);
      reset();
      mutate(`/api/income-component?show_all=${isShowDeletedDataChecked}`);

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

  const handlePurge = async (data: IncomeComponent) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await purgeIncomeComponent(data.id);
      setVisible(false);
      reset();
      mutate(`/api/income-component?show_all=${isShowDeletedDataChecked}`);

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

  const handleRestore = async (data: IncomeComponent) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await restoreIncomeComponent(data.id, data.row_version);
      setVisible(false);
      reset();
      mutate(`/api/income-component?show_all=${isShowDeletedDataChecked}`);

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

  const onSubmit = (data: IncomeComponent) => {
    if (!isValid) return;

    if (isAddNew) {
      handleSubmitNew(data);
      return;
    }

    if (selectedData) {
      handleUpdate(data);
    }
  };

  const onClickUpdate = (data: IncomeComponent) => {
    setVisible(true);
    setIsAddNew(false);
    setPopupHeaderTitle("Update Income Component");

    reset(data);
    setSelectedData(data);
  };

  const activeColumnBody = (rowData: IncomeComponent) => {
    return rowData.is_active ? (
      <Tag value="Active" severity="success" />
    ) : (
      <Tag value="Inactive" severity="danger" />
    );
  };

  const actionColumnBody = (rowData: IncomeComponent) => {
    return (
      <>
        <div className="flex gap-2">
          {hasRole(profileState.role, ["superadmin"]) && (
            <Button
              tooltipOptions={{
                appendTo: () => document.body,
                position: "top",
              }}
              tooltip="delete forever"
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

          {hasRole(profileState.role, ["superadmin"]) && rowData.deleted_at && (
            <Button
              tooltipOptions={{
                appendTo: () => document.body,
                position: "top",
              }}
              tooltip="restore"
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
              tooltip="delete"
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
            tooltip="update"
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

  const onClickDelete = (data: IncomeComponent) => {
    confirmDialog({
      message: "Do you want to delete this record?",
      header: "Delete Confirmation",
      icon: "pi pi-info-circle",
      defaultFocus: "accept",
      acceptClassName: "p-button-danger ml-3",
      accept: () => {
        setSelectedData(data);
        handleDelete(data);
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
            className="p-button-danger"
          />
        </div>
      ),
    });
  };

  const onClickRestore = (data: IncomeComponent) => {
    confirmDialog({
      message: "Do you want to restore this record?",
      header: "Restore Confirmation",
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

  const onClickPurge = (data: IncomeComponent) => {
    confirmDialog({
      message: "Do you want to delete this record forever?",
      header: "Delete Confirmation",
      icon: "pi pi-info-circle",
      defaultFocus: "accept",
      acceptClassName: "p-button-danger ml-3",
      accept: () => {
        handlePurge(data);
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
            className="p-button-danger"
          />
        </div>
      ),
    });
  };

  const isTaxableColumnBody = (rowData: IncomeComponent) => {
    return rowData.is_taxable ? (
      <i className="pi pi-check"></i>
    ) : (
      <i className="pi pi-times"></i>
    );
  };

  return (
    <>
      <ConfirmDialog />
      <Card title={<CardTitle title="Income Component" url="" />}>
        <div className="p-3 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button
                label="New"
                icon="pi pi-plus"
                size="small"
                onClick={() => {
                  onClickNew();
                }}
              />

              <div className="flex align-items-center pl-5">
                <Checkbox
                  inputId="showDeletedData"
                  name="showDeletedData"
                  value="yes"
                  onChange={onIngredientsChange}
                  checked={isShowDeletedDataChecked}
                />
                <label htmlFor="showDeletedData" className="ml-2">
                  show deleted data
                </label>
              </div>
            </div>

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
            value={IncomeComponentData}
            tableStyle={{ minWidth: "50rem" }}
            stripedRows
            paginator
            scrollable
            scrollHeight="500px"
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            dataKey="id"
            globalFilterFields={["name"]}
            emptyMessage="No Income Component found."
            header={<></>}
            filters={filters}
            currentPageReportTemplate="{first} to {last} of {totalRecords}"
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            loading={isLoading}
          >
            <Column
              header="#"
              headerStyle={{ width: "3rem" }}
              body={(data, options) => options.rowIndex + 1}
            ></Column>
            <Column field="code" header="Code"></Column>
            <Column field="name" header="Name"></Column>
            <Column
              field="is_taxable"
              header="Taxable"
              body={isTaxableColumnBody}
            ></Column>
            <Column
              field="calculation_method_name"
              header="Calculation Method"
            ></Column>
            <Column
              field="is_active"
              header="Active"
              body={activeColumnBody}
            ></Column>

            <Column
              headerClassName="bg-white"
              className="bg-white"
              header="Action"
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
              <label htmlFor="category">Category</label>
              <Controller
                name="category"
                rules={{ required: "*required" }}
                control={control}
                render={({ field, fieldState }) => (
                  <>
                    <Dropdown
                      id="category"
                      appendTo={() => document.body}
                      value={field.value}
                      options={activeComponentCategory}
                      loading={isLoadingComponentCategory}
                      disabled={isLoadingComponentCategory}
                      onChange={(e) => {
                        field.onChange(e.value ?? null);
                      }}
                      optionLabel="name"
                      optionValue="id"
                      showClear={true}
                      placeholder={
                        isLoadingComponentCategory
                          ? "Loading component categories..."
                          : "Select a component category"
                      }
                      className={fieldState.invalid ? "p-invalid" : ""}
                    />
                    {fieldState.error && (
                      <small className="font-bold">
                        {fieldState.error.message}
                      </small>
                    )}
                    {errorComponentCategory && (
                      <small className="p-error font-bold">
                        We couldn’t load the list of component categories.
                        Please try again
                      </small>
                    )}
                  </>
                )}
              />
            </div>

            <div className="m-0 flex flex-col gap-2">
              <label htmlFor="code">Code</label>
              <Controller
                name="code"
                control={control}
                rules={{
                  required: "*required",
                  validate: (value) =>
                    !/\s/.test(value) || "must not contain spaces.",
                  maxLength: { value: 50, message: "maximum 50 character" },
                }}
                render={({ field, fieldState }) => (
                  <>
                    <InputText
                      id="code"
                      placeholder=""
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
              <label htmlFor="name">Name</label>
              <Controller
                name="name"
                control={control}
                rules={{
                  required: "*required",
                  maxLength: { value: 50, message: "maximum 50 character" },
                }}
                render={({ field, fieldState }) => (
                  <>
                    <InputText
                      id="name"
                      placeholder="name"
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
              <label htmlFor="calculation_method">Calculation Method</label>
              <Controller
                name="calculation_method"
                control={control}
                render={({ field, fieldState }) => (
                  <>
                    <Dropdown
                      id="calculation_method"
                      appendTo={() => document.body}
                      value={field.value}
                      options={calculationMethodActive}
                      loading={calculationMethodIsLoading}
                      disabled={calculationMethodIsLoading}
                      onChange={(e) => {
                        field.onChange(e.value ?? null);
                      }}
                      optionLabel="name"
                      optionValue="id"
                      showClear={true}
                      placeholder={
                        isLoading
                          ? "Loading calculation methods..."
                          : "Select a calculation method"
                      }
                      className={fieldState.invalid ? "p-invalid" : ""}
                    />
                    {fieldState.error && (
                      <small className="font-bold">
                        {fieldState.error.message}
                      </small>
                    )}
                    {calculationMethodError && (
                      <small className="p-error font-bold">
                        We couldn’t load the list of calculation methods. Please
                        try again
                      </small>
                    )}
                  </>
                )}
              />
            </div>

            {watch("calculation_method") === 4 && ( //cek lagi master calculation method
              <div className="m-0 flex flex-col gap-2">
                <label htmlFor="formula_id">Formula</label>
                <Controller
                  name="formula_id"
                  rules={
                    watch("calculation_method") === 4
                      ? { required: "*required" }
                      : {}
                  }
                  control={control}
                  render={({ field, fieldState }) => (
                    <>
                      <Dropdown
                        id="formula_id"
                        appendTo={() => document.body}
                        value={field.value}
                        options={activeFormula}
                        loading={isLoadingFormula}
                        disabled={isLoadingFormula}
                        onChange={(e) => {
                          field.onChange(e.value ?? null);
                        }}
                        optionLabel="name"
                        optionValue="id"
                        showClear={true}
                        placeholder={
                          isLoading ? "Loading formulas..." : "Select a formula"
                        }
                        className={fieldState.invalid ? "p-invalid" : ""}
                      />
                      {fieldState.error && (
                        <small className="font-bold">
                          {fieldState.error.message}
                        </small>
                      )}
                      {errorFormula && (
                        <small className="p-error font-bold">
                          We couldn’t load the list of formulas. Please try
                          again
                        </small>
                      )}
                    </>
                  )}
                />
              </div>
            )}

            <div className="m-0 flex gap-2">
              <Controller
                name="is_taxable"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    inputId="is_taxable"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.checked)}
                  ></Checkbox>
                )}
              />
              <label htmlFor="is_taxable">Taxable</label>
            </div>

            <div className="m-0 flex flex-col gap-2">
              <label htmlFor="is_active">Active</label>
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

export default IncomeComponentTableData;
