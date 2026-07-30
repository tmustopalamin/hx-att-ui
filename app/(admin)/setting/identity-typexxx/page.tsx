"use client";

import CardTitle from "@/app/_components/CardTitle";
import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { confirmDialog, ConfirmDialog } from "primereact/confirmdialog";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { Toast } from "primereact/toast";
import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

interface IdentityType {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const IdentityTypeSettingPage = () => {
  const [data, setData] = useState([]);

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState({
    global: { value: "", matchMode: FilterMatchMode.CONTAINS },
  });

  const [isAddNew, setIsAddNew] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);

  const [visible, setVisible] = useState(false);
  const [popupHeaderTitle, setPopupHeaderTitle] = useState("");
  const toast = useRef<Toast>(null!);

  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors, isValid },
    reset,
    setValue,
    watch,
  } = useForm({
    defaultValues: {
      name: "",
      is_active: true,
    },
  });

  const getData = () => {
    setTableLoading(true);

    fetch("/api/identity-type", {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setTableLoading(false);
      });
  };

  useEffect(() => {
    document.title = "Identity Type Setting";

    getData();
  }, []);

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const _filters = { ...filters };

    _filters["global"].value = value;

    setFilters(_filters);
    setGlobalFilterValue(value);
  };

  const renderTableHeader = () => {
    return <></>;
  };
  const header = renderTableHeader();

  const onClickNew = () => {
    setIsAddNew(true);
    setVisible(true);
    setPopupHeaderTitle("New Identity Type");
  };

  const footerContent = (
    <div>
      <Button
        label="Cancel"
        icon="pi pi-times"
        onClick={() => setVisible(false)}
        className="p-button-text"
      />
      <Button
        label={isAddNew ? "Submit" : "Save"}
        icon="pi pi-check"
        disabled={!isValid}
        type="submit"
      />
    </div>
  );

  const handleSubmitNew = async (data: {
    name: string;
    is_active: boolean;
  }) => {
    try {
      const res = await fetch("/api/identity-type", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }

      setVisible(false);
      reset();
      getData();

      toast.current?.show({
        severity: "success",
        summary: "success",
        detail: "add success",
        life: 3000,
      });
    } catch (err: unknown) {
      toast.current?.show({
        severity: "error",
        summary: "error",
        detail: "Failed to submit the form. Please try again later" + err,
        life: 3000,
      });
    }
  };

  const handleSubmitUpdate = async (data: {
    name: string;
    is_active: boolean;
  }) => {
    try {
      const res = await fetch("/api/identity-type", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...data, id: selectedId }),
      });

      if (!res.ok) throw new Error(`Failed to update: ${res.status}`);
      const data_res = await res.json();

      setVisible(false);
      reset();
      getData();

      toast.current?.show({
        severity: "success",
        summary: "success",
        detail: "update success",
        life: 3000,
      });
    } catch (err: unknown) {
      toast.current?.show({
        severity: "error",
        summary: "error",
        detail: "Failed to update the form. Please try again later" + err,
        life: 3000,
      });
    }
  };

  const handleSubmitDelete = async (id: number) => {
    setSelectedId(id);

    try {
      const res = await fetch("/api/identity-type", {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: selectedId }),
      });

      if (!res.ok) throw new Error(`Failed to delete: ${res.status}`);
      const data_res = await res.json();

      setVisible(false);
      reset();
      getData();

      toast.current?.show({
        severity: "success",
        summary: "success",
        detail: "delete success",
        life: 3000,
      });
    } catch (err: unknown) {
      toast.current?.show({
        severity: "error",
        summary: "error",
        detail: "Failed to delete the form. Please try again later" + err,
        life: 3000,
      });
    }
  };

  const onSubmit = (data: { name: string; is_active: boolean }) => {
    if (!isValid) {
      return;
    }

    if (isAddNew) {
      handleSubmitNew(data);
      return;
    }

    handleSubmitUpdate(data);
  };

  const [selectedId, setSelectedId] = useState(0);
  const onClickUpdate = (rowData: IdentityType) => {
    setVisible(true);
    setIsAddNew(false);
    setPopupHeaderTitle("Update Identity Type");

    setSelectedId(rowData.id);
    setValue("name", rowData.name);
    setValue("is_active", rowData.is_active);
  };

  const activeColumnBody = (value: IdentityType) => {
    return value.is_active ? "Active" : "Not Active";
  };

  const actionColumnBody = (rowData: IdentityType) => {
    return (
      <>
        <div className="flex gap-2">
          <Button
            severity="danger"
            label=""
            icon="pi pi-trash"
            size="small"
            onClick={() => {
              onClickDelete(rowData.id);
            }}
          />
          <Button
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

  const onClickDelete = (id: number) => {
    confirmDialog({
      message: "Do you want to delete this record?",
      header: "Delete Confirmation",
      icon: "pi pi-info-circle",
      defaultFocus: "reject",
      acceptClassName: "p-button-danger ml-3",
      accept: () => {
        handleSubmitDelete(id);
      },
      reject: () => {},
    });
  };

  return (
    <>
      <Toast ref={toast} position="top-center" />
      <ConfirmDialog />
      <Card title={<CardTitle title="Identity Type" url="" />}>
        <div className="p-3">
          <div className="flex items-center justify-between">
            <Button
              label="New"
              icon="pi pi-plus"
              size="small"
              onClick={() => {
                onClickNew();
              }}
            />

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
            value={data}
            tableStyle={{ minWidth: "50rem" }}
            stripedRows
            paginator
            rows={5}
            rowsPerPageOptions={[5, 10, 25, 50]}
            dataKey="id"
            globalFilterFields={["name"]}
            emptyMessage="No identity type found."
            header={header}
            filters={filters}
            currentPageReportTemplate="{first} to {last} of {totalRecords}"
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            loading={tableLoading}
          >
            <Column
              header="#"
              headerStyle={{ width: "3rem" }}
              body={(data, options) => options.rowIndex + 1}
            ></Column>
            <Column field="name" header="Name"></Column>
            <Column
              field="is_active"
              header="Status"
              body={activeColumnBody}
            ></Column>
            <Column
              header="Action"
              body={(rowData) => actionColumnBody(rowData)}
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
              <label htmlFor="name">Name</label>
              <InputText
                {...register("name", {
                  required: "this is required",
                  maxLength: { value: 50, message: "maximum 50 character" },
                })}
              />
              <small className="font-bold">{errors.name?.message}</small>
            </div>

            <div className="m-0 flex flex-col gap-2">
              <label htmlFor="is_active">Active</label>
              <InputSwitch
                {...register("is_active")}
                checked={watch("is_active")}
                onChange={(e) => setValue("is_active", e.value)}
              />
            </div>
          </div>
        </Dialog>
      </form>
    </>
  );
};

export default IdentityTypeSettingPage;
