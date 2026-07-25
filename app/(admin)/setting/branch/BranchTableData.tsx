"use client";

import { useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useDispatch } from "react-redux";

import { Branch } from "@/app/types/branch";
import { Agency } from "@/app/types/agency";
import {
  createBranch,
  deleteBranch,
  purgeBranch,
  restoreBranch,
  updateBranch,
} from "@/app/services/branch-service";
import { fetcher } from "@/app/utils/fetcher";
import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { showToast } from "@/store/ToastSlice";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";

import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Checkbox } from "primereact/checkbox";
import { Column } from "primereact/column";
import { confirmDialog, ConfirmDialog } from "primereact/confirmdialog";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Tag } from "primereact/tag";

type StateOption = {
  id: number;
  name: string;
  country_id?: number | null;
  is_active?: boolean;
  deleted_at?: string | null;
};

type CityOption = {
  id: number;
  name: string;
  state_id: number;
  is_active?: boolean;
  deleted_at?: string | null;
};

const emptyForm: Branch = {
  id: 0,
  code: "",
  name: "",
  agency_id: null,
  agency_name: null,
  address: "",
  city_id: 0,
  city_name: null,
  state_id: 0,
  state_name: null,
  postal_code: "",
  phone_number: "",
  fax_number: "",
  nitku_number: "",
  npwp15_number: "",
  npwp16_number: "",
  is_active: true,
  deleted_at: null,
  row_version: 0,
};

const BranchFormWatcher = ({
  control,
  stateOptions,
  cityOptions,
}: {
  control: any;
  stateOptions: StateOption[];
  cityOptions: CityOption[];
}) => {
  const selectedStateId = useWatch({
    control,
    name: "state_id",
  });

  const filteredCities = useMemo(() => {
    if (!selectedStateId) return [];
    return cityOptions.filter((city) => city.state_id === selectedStateId);
  }, [selectedStateId, cityOptions]);

  return (
    <Controller
      name="city_id"
      control={control}
      rules={{
        required: "City is required",
        validate: (value: number) => Number(value) > 0 || "City is required",
      }}
      render={({ field, fieldState }) => (
        <div>
          <label className="mb-2 block text-sm font-medium">City</label>
          <Dropdown
            value={field.value}
            options={filteredCities}
            onChange={(e) => field.onChange(e.value)}
            optionLabel="name"
            optionValue="id"
            placeholder={selectedStateId ? "Select city" : "Select state first"}
            disabled={!selectedStateId}
            className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
          />
          {fieldState.error && (
            <small className="p-error">{fieldState.error.message}</small>
          )}
        </div>
      )}
    />
  );
};

const BranchTableData = () => {
  const dispatch = useDispatch();

  const [selectedData, setSelectedData] = useState<Branch | null>(null);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState({
    global: { value: "", matchMode: FilterMatchMode.CONTAINS },
  });
  const [visible, setVisible] = useState(false);
  const [isAddNew, setIsAddNew] = useState(false);
  const [popupHeaderTitle, setPopupHeaderTitle] = useState("");
  const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] =
    useState(false);

  const {
    control,
    handleSubmit,
    formState: { isValid },
    reset,
    clearErrors,
    setFocus,
  } = useForm<Branch>({
    defaultValues: emptyForm,
    mode: "onChange",
  });

  const branchKey = `/api/branch?show_all=${isShowDeletedDataChecked}`;

  const { data, error, isLoading } = useSWR<Branch[]>(branchKey, fetcher);
  const { data: agencyData } = useSWR<Agency[]>(
    "/api/agency?show_all=false",
    fetcher,
  );
  const { data: stateData } = useSWR<StateOption[]>(
    "/api/state?show_all=false",
    fetcher,
  );
  const { data: cityData } = useSWR<CityOption[]>(
    "/api/city?show_all=false",
    fetcher,
  );

  const activeAgency = useMemo(
    () => (agencyData ?? []).filter((v) => !v.deleted_at && v.is_active),
    [agencyData],
  );

  const activeState = useMemo(
    () =>
      (stateData ?? []).filter((v) => !v.deleted_at && v.is_active !== false),
    [stateData],
  );

  const activeCity = useMemo(
    () =>
      (cityData ?? []).filter((v) => !v.deleted_at && v.is_active !== false),
    [cityData],
  );

  const summary = useMemo(() => {
    const rows = data ?? [];
    return {
      total: rows.length,
      active: rows.filter((v) => !v.deleted_at && v.is_active).length,
      inactive: rows.filter((v) => !v.deleted_at && !v.is_active).length,
      deleted: rows.filter((v) => !!v.deleted_at).length,
    };
  }, [data]);

  const refreshList = async () => {
    await mutate(branchKey);
  };

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setGlobalFilterValue(value);
    setFilters({
      global: { value, matchMode: FilterMatchMode.CONTAINS },
    });
  };

  const onClickNew = () => {
    clearErrors();
    setSelectedData(null);
    setIsAddNew(true);
    setVisible(true);
    setPopupHeaderTitle("New Branch");
    reset(emptyForm);

    setTimeout(() => {
      setFocus("code");
    }, 0);
  };

  const onClickEdit = (data: Branch) => {
    setSelectedData(data);
    setIsAddNew(false);
    setVisible(true);
    setPopupHeaderTitle("Edit Branch");
    reset({
      ...data,
      agency_id: data.agency_id ?? null,
      address: data.address ?? "",
      postal_code: data.postal_code ?? "",
      phone_number: data.phone_number ?? "",
      fax_number: data.fax_number ?? "",
      nitku_number: data.nitku_number ?? "",
      npwp16_number: data.npwp16_number ?? "",
      deleted_at: data.deleted_at ?? null,
    });
  };

  const closeDialog = () => {
    setVisible(false);
    setSelectedData(null);
    reset(emptyForm);
  };

  const handleSubmitNew = async (form: Branch) => {
    try {
      const res = await createBranch({
        ...form,
        code: form.code.trim(),
        name: form.name.trim(),
        agency_id: form.agency_id ?? null,
        address: form.address?.trim() || null,
        postal_code: form.postal_code?.trim() || null,
        phone_number: form.phone_number?.trim() || null,
        fax_number: form.fax_number?.trim() || null,
        nitku_number: form.nitku_number?.trim() || null,
        npwp15_number: form.npwp15_number.trim(),
        npwp16_number: form.npwp16_number?.trim() || null,
      });

      closeDialog();
      await refreshList();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res.message ?? "Branch created successfully",
        }),
      );
    } catch (err: unknown) {
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
    }
  };

  const handleUpdate = async (form: Branch) => {
    if (!selectedData) return;

    try {
      const res = await updateBranch(
        selectedData.id,
        selectedData.row_version,
        {
          ...form,
          code: form.code.trim(),
          name: form.name.trim(),
          agency_id: form.agency_id ?? null,
          address: form.address?.trim() || null,
          postal_code: form.postal_code?.trim() || null,
          phone_number: form.phone_number?.trim() || null,
          fax_number: form.fax_number?.trim() || null,
          nitku_number: form.nitku_number?.trim() || null,
          npwp15_number: form.npwp15_number.trim(),
          npwp16_number: form.npwp16_number?.trim() || null,
        },
      );

      closeDialog();
      await refreshList();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res.message ?? "Branch updated successfully",
        }),
      );
    } catch (err: unknown) {
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
    }
  };

  const handleDelete = async (data: Branch) => {
    try {
      const res = await deleteBranch(data.id, data.row_version);
      await refreshList();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res.message ?? "Branch deleted successfully",
        }),
      );
    } catch (err: unknown) {
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
    }
  };

  const handleRestore = async (data: Branch) => {
    try {
      const res = await restoreBranch(data.id, data.row_version);
      await refreshList();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res.message ?? "Branch restored successfully",
        }),
      );
    } catch (err: unknown) {
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
    }
  };

  const handlePurge = async (data: Branch) => {
    try {
      const res = await purgeBranch(data.id);
      await refreshList();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res.message ?? "Branch permanently deleted",
        }),
      );
    } catch (err: unknown) {
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
    }
  };

  const onSubmit = (form: Branch) => {
    if (!isValid) return;
    if (isAddNew) {
      void handleSubmitNew(form);
      return;
    }
    void handleUpdate(form);
  };

  const onClickDelete = (data: Branch) => {
    confirmDialog({
      message: "Do you want to delete this branch?",
      header: "Delete Confirmation",
      icon: "pi pi-info-circle",
      acceptClassName: "p-button-danger",
      accept: () => {
        void handleDelete(data);
      },
    });
  };

  const onClickRestore = (data: Branch) => {
    confirmDialog({
      message: "Do you want to restore this branch?",
      header: "Restore Confirmation",
      icon: "pi pi-info-circle",
      acceptClassName: "p-button-success",
      accept: () => {
        void handleRestore(data);
      },
    });
  };

  const onClickPurge = (data: Branch) => {
    confirmDialog({
      message: "Do you want to permanently delete this branch?",
      header: "Permanent Delete Confirmation",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: () => {
        void handlePurge(data);
      },
    });
  };

  const activeBodyTemplate = (rowData: Branch) => {
    return rowData.is_active ? (
      <Tag value="Active" severity="success" />
    ) : (
      <Tag value="Inactive" severity="warning" />
    );
  };

  const statusBodyTemplate = (rowData: Branch) => {
    return rowData.deleted_at ? (
      <Tag value="Deleted" severity="danger" />
    ) : (
      <Tag value="Normal" severity="info" />
    );
  };

  const actionColumnBody = (rowData: Branch) => {
    if (rowData.deleted_at) {
      return (
        <div className="flex gap-2">
          <Button
            rounded
            severity="success"
            icon="pi pi-refresh"
            size="small"
            onClick={() => onClickRestore(rowData)}
          />
          <Button
            rounded
            severity="secondary"
            icon="pi pi-times"
            size="small"
            onClick={() => onClickPurge(rowData)}
          />
        </div>
      );
    }

    return (
      <div className="flex gap-2">
        <Button
          rounded
          severity="help"
          icon="pi pi-pencil"
          size="small"
          onClick={() => onClickEdit(rowData)}
        />
        <Button
          rounded
          severity="danger"
          icon="pi pi-trash"
          size="small"
          onClick={() => onClickDelete(rowData)}
        />
      </div>
    );
  };

  if (isLoading) return <LoadingDataTable />;
  if (error)
    return <ErrorNotConnectedToApi mutateKey="/api/branch?show_all=true" />;

  return (
    <>
      <ConfirmDialog />

      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="shadow-sm">
            <div>
              <p className="text-sm text-slate-500">Total</p>
              <h3 className="text-2xl font-semibold">{summary.total}</h3>
            </div>
          </Card>
          <Card className="shadow-sm">
            <div>
              <p className="text-sm text-slate-500">Active</p>
              <h3 className="text-2xl font-semibold">{summary.active}</h3>
            </div>
          </Card>
          <Card className="shadow-sm">
            <div>
              <p className="text-sm text-slate-500">Inactive</p>
              <h3 className="text-2xl font-semibold">{summary.inactive}</h3>
            </div>
          </Card>
          <Card className="shadow-sm">
            <div>
              <p className="text-sm text-slate-500">Deleted</p>
              <h3 className="text-2xl font-semibold">{summary.deleted}</h3>
            </div>
          </Card>
        </div>

        <Card className="shadow-sm">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-2xl font-semibold">Branch</h1>
                <p className="text-sm text-slate-500">
                  Manage branch / work location master under agency.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <Checkbox
                    inputId="showDeletedBranch"
                    checked={isShowDeletedDataChecked}
                    onChange={() =>
                      setIsShowDeletedDataChecked((prev) => !prev)
                    }
                  />
                  <label htmlFor="showDeletedBranch" className="text-sm">
                    Show deleted data
                  </label>
                </div>

                <IconField iconPosition="left">
                  <InputIcon className="pi pi-search" />
                  <InputText
                    value={globalFilterValue}
                    onChange={onGlobalFilterChange}
                    placeholder="Search branch"
                    className="w-full sm:w-72"
                  />
                </IconField>

                <Button
                  label="New Branch"
                  icon="pi pi-plus"
                  onClick={onClickNew}
                />
              </div>
            </div>

            <DataTable
              value={data ?? []}
              stripedRows
              paginator
              rows={10}
              rowsPerPageOptions={[10, 25, 50]}
              dataKey="id"
              filters={filters}
              globalFilterFields={[
                "code",
                "name",
                "agency_name",
                "city_name",
                "state_name",
                "phone_number",
                "npwp15_number",
              ]}
              emptyMessage="No branch found."
              loading={isLoading}
              scrollable
              tableStyle={{ minWidth: "90rem" }}
            >
              <Column
                header="#"
                body={(_, options) => options.rowIndex + 1}
                style={{ width: "4rem" }}
              />
              <Column
                field="code"
                header="Code"
                style={{ minWidth: "10rem" }}
              />
              <Column
                field="name"
                header="Name"
                style={{ minWidth: "14rem" }}
              />
              <Column
                field="agency_name"
                header="Agency"
                style={{ minWidth: "14rem" }}
              />
              <Column
                field="state_name"
                header="State"
                style={{ minWidth: "12rem" }}
              />
              <Column
                field="city_name"
                header="City"
                style={{ minWidth: "12rem" }}
              />
              <Column
                field="phone_number"
                header="Phone"
                style={{ minWidth: "10rem" }}
              />
              <Column
                field="npwp15_number"
                header="NPWP 15"
                style={{ minWidth: "12rem" }}
              />
              <Column
                header="Active"
                body={activeBodyTemplate}
                style={{ minWidth: "8rem" }}
              />
              <Column
                header="Status"
                body={statusBodyTemplate}
                style={{ minWidth: "8rem" }}
              />
              <Column
                header="Action"
                body={actionColumnBody}
                frozen
                alignFrozen="right"
                style={{ minWidth: "10rem" }}
              />
            </DataTable>
          </div>
        </Card>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Dialog
          header={popupHeaderTitle}
          visible={visible}
          style={{ width: "68rem", maxWidth: "95vw" }}
          onHide={closeDialog}
          onShow={() => setTimeout(() => setFocus("code"), 0)}
          breakpoints={{ "960px": "90vw", "640px": "96vw" }}
          footer={
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                label="Cancel"
                icon="pi pi-times"
                className="p-button-text"
                onClick={closeDialog}
              />
              <Button
                type="submit"
                label={isAddNew ? "Submit" : "Save"}
                icon="pi pi-check"
                disabled={!isValid}
              />
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-5 pt-2 md:grid-cols-2">
            <div className="md:col-span-2">
              <p className="text-sm font-semibold">Basic Information</p>
            </div>

            <Controller
              name="code"
              control={control}
              rules={{ required: "Code is required" }}
              render={({ field, fieldState }) => (
                <div>
                  <label className="mb-2 block text-sm font-medium">Code</label>
                  <InputText
                    {...field}
                    className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                  />
                  {fieldState.error && (
                    <small className="p-error">
                      {fieldState.error.message}
                    </small>
                  )}
                </div>
              )}
            />

            <Controller
              name="name"
              control={control}
              rules={{ required: "Name is required" }}
              render={({ field, fieldState }) => (
                <div>
                  <label className="mb-2 block text-sm font-medium">Name</label>
                  <InputText
                    {...field}
                    className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                  />
                  {fieldState.error && (
                    <small className="p-error">
                      {fieldState.error.message}
                    </small>
                  )}
                </div>
              )}
            />

            <Controller
              name="agency_id"
              control={control}
              rules={{
                required: "Agency is required",
                validate: (value) => !!value || "Agency is required",
              }}
              render={({ field, fieldState }) => (
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium">
                    Agency
                  </label>
                  <Dropdown
                    value={field.value}
                    options={activeAgency}
                    onChange={(e) => field.onChange(e.value)}
                    optionLabel="name"
                    optionValue="id"
                    placeholder="Select agency"
                    className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                  />
                  {fieldState.error && (
                    <small className="p-error">
                      {fieldState.error.message}
                    </small>
                  )}
                </div>
              )}
            />

            <div className="md:col-span-2">
              <p className="text-sm font-semibold">Location</p>
            </div>

            <Controller
              name="state_id"
              control={control}
              rules={{
                required: "State is required",
                validate: (value) => Number(value) > 0 || "State is required",
              }}
              render={({ field, fieldState }) => (
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    State
                  </label>
                  <Dropdown
                    value={field.value}
                    options={activeState}
                    onChange={(e) => field.onChange(e.value)}
                    optionLabel="name"
                    optionValue="id"
                    placeholder="Select state"
                    className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                  />
                  {fieldState.error && (
                    <small className="p-error">
                      {fieldState.error.message}
                    </small>
                  )}
                </div>
              )}
            />

            <BranchFormWatcher
              control={control}
              stateOptions={activeState}
              cityOptions={activeCity}
            />

            <Controller
              name="postal_code"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Postal Code
                  </label>
                  <InputText {...field} className="w-full" />
                </div>
              )}
            />

            <Controller
              name="address"
              control={control}
              render={({ field }) => (
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium">
                    Address
                  </label>
                  <InputTextarea {...field} rows={3} className="w-full" />
                </div>
              )}
            />

            <div className="md:col-span-2">
              <p className="text-sm font-semibold">Contact & Tax</p>
            </div>

            <Controller
              name="phone_number"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Phone
                  </label>
                  <InputText {...field} className="w-full" />
                </div>
              )}
            />

            <Controller
              name="fax_number"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="mb-2 block text-sm font-medium">Fax</label>
                  <InputText {...field} className="w-full" />
                </div>
              )}
            />

            <Controller
              name="nitku_number"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    NITKU Number
                  </label>
                  <InputText {...field} className="w-full" />
                </div>
              )}
            />

            <Controller
              name="npwp15_number"
              control={control}
              rules={{ required: "NPWP 15 is required" }}
              render={({ field, fieldState }) => (
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    NPWP 15 Number
                  </label>
                  <InputText
                    {...field}
                    className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                  />
                  {fieldState.error && (
                    <small className="p-error">
                      {fieldState.error.message}
                    </small>
                  )}
                </div>
              )}
            />

            <Controller
              name="npwp16_number"
              control={control}
              render={({ field }) => (
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium">
                    NPWP 16 Number
                  </label>
                  <InputText {...field} className="w-full" />
                </div>
              )}
            />

            <div className="md:col-span-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <Controller
                  name="is_active"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-start justify-between gap-4 rounded-xl bg-white p-4">
                      <div>
                        <p className="text-sm font-semibold">Active</p>
                        <p className="text-xs text-slate-500">
                          Enable if this branch can be selected in employee
                          employment.
                        </p>
                      </div>
                      <InputSwitch
                        checked={!!field.value}
                        onChange={(e) => field.onChange(e.value)}
                      />
                    </div>
                  )}
                />
              </div>
            </div>
          </div>
        </Dialog>
      </form>
    </>
  );
};

export default BranchTableData;
