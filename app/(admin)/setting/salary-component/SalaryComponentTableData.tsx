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
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import { InputSwitch } from "primereact/inputswitch";
import { useState } from "react";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/app/utils/fetcher";
import {
  ResponseType,
  ResponseTypeCreateSuccess,
} from "@/app/types/response-type";
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
import {
  createSalaryComponent,
  updateSalaryComponent,
  deleteSalaryComponent,
  purgeSalaryComponent,
  restoreSalaryComponent,
} from "@/app/services/salary-component-service";
import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import { SalaryComponent } from "@/app/types/salary_component";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import dayjs from "dayjs";
import { Calendar } from "primereact/calendar";

const SalaryComponentTableData = () => {
  const dispatch = useDispatch();
  const profileState = useSelector((state: RootState) => state.profile);
  const archivedAccess = useArchivedDataAccess("payroll");
  const [selectedData, setSelectedData] = useState<SalaryComponent | null>(
    null,
  );
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState({
    global: { value: "", matchMode: FilterMatchMode.CONTAINS },
  });
  const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] =
    useState(false);
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
  } = useForm<SalaryComponent>();
  const { fields, append, remove } = useFieldArray({
    control: control,
    name: "formula",
  });

  const {
    data: SalaryComponentData,
    error,
    isLoading,
  } = useSWR<SalaryComponent[]>(
    `/api/salary-component?show_all=${archivedAccess.canShowDeleted && isShowDeletedDataChecked}`,
    fetcher,
  );

  if (isLoading) return <LoadingDataTable />;
  if (error)
    return (
      <ErrorNotConnectedToApi
        mutateKey={`/api/salary-component?show_all=${archivedAccess.canShowDeleted && isShowDeletedDataChecked}`}
      />
    );

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const _filters = { ...filters };
    _filters["global"].value = value;
    setFilters(_filters);
    setGlobalFilterValue(value);
  };

  const onIngredientsChange = () => {
    setIsShowDeletedDataChecked(!isShowDeletedDataChecked);
  };

  const onClickNew = () => {
    clearErrors();
    setIsAddNew(true);
    setVisible(true);
    setPopupHeaderTitle("New Salary Component");
    reset({
      id: 0,
      code: "",
      name: "",
      component_type: "",
      calculation_type: "",
      default_amount: 0,
      percentage: 0,
      base_component: "",
      taxable: false,
      is_active: true,
      deleted_at: 0,
      row_version: 0,
      formula: [],
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

  const activeColumnBody = (rowData: SalaryComponent) => {
    return rowData.is_active ? (
      <Tag value="Active" severity="success" />
    ) : (
      <Tag value="Inactive" severity="danger" />
    );
  };

  return (
    <>
      <Card>
        <div className="p-4 flex flex-col gap-4">
          {/* HEADER */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b pb-3">
            <div>
              <div className="text-2xl font-semibold">Salary Component</div>
              <div className="text-sm text-gray-500">
                Manage salary component master data
              </div>
            </div>

            <div className="flex items-center gap-5">
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
                    show deleted data
                  </label>
                </div>
              )}

              <IconField iconPosition="left">
                <InputIcon className="pi pi-search" />
                <InputText
                  className="p-inputtext-sm"
                  value={globalFilterValue}
                  onChange={onGlobalFilterChange}
                  placeholder="Keyword Search"
                />
              </IconField>

              <Button
                label="New"
                icon="pi pi-plus"
                size="small"
                onClick={() => {
                  onClickNew();
                }}
              />
            </div>
          </div>

          {/* TABLE */}
          <DataTable
            value={SalaryComponentData}
            stripedRows
            paginator
            scrollable
            scrollHeight="500px"
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            dataKey="id"
            filters={filters}
            globalFilterFields={[
              "code",
              "name",
              "component_type",
              "calculation_type",
            ]}
            loading={isLoading}
          >
            <Column
              header="#"
              body={(data, options) => options.rowIndex + 1}
            ></Column>
            <Column field="code" header="Code"></Column>
            <Column field="name" header="Name"></Column>
            <Column field="component_type" header="Component Type"></Column>
            <Column field="calculation_type" header="Calculation Type"></Column>
            <Column field="default_amount" header="Default Amount"></Column>
            <Column field="percentage" header="Percentage"></Column>
            <Column field="base_component" header="Base Component"></Column>
            <Column field="taxable" header="Taxable"></Column>
            <Column
              field="is_active"
              header="Active"
              body={activeColumnBody}
            ></Column>
          </DataTable>
        </div>
      </Card>

      {/* Dialog tetap seperti kode kamu */}
    </>
  );
};

export default SalaryComponentTableData;
