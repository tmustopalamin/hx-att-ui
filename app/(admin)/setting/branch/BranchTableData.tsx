"use client";
import { useI18n } from "@/app/i18n";

import { ChangeEvent, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import useSWR from "swr";

import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Checkbox } from "primereact/checkbox";
import { Column } from "primereact/column";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Tag } from "primereact/tag";

import { useDispatch, useSelector } from "react-redux";

import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";

import {
  createBranch,
  deleteBranch,
  purgeBranch,
  restoreBranch,
  updateBranch,
} from "@/app/services/branch-service";

import { Agency } from "@/app/types/agency";
import { Branch } from "@/app/types/branch";

import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { fetcher } from "@/app/utils/fetcher";
import { useArchivedDataAccess } from "@/app/utils/archived-data-access";

import { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";

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

const EMPTY_BRANCH: Branch = {
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

const getBody = () => document.body;

const BranchTableData = () => {
  const { t: i18nT } = useI18n();
  const dispatch = useDispatch();

  const profileState = useSelector((state: RootState) => state.profile);
  const archivedAccess = useArchivedDataAccess("master-data");

  const [selectedData, setSelectedData] = useState<Branch | null>(null);

  const [globalFilterValue, setGlobalFilterValue] = useState("");

  const [filters, setFilters] = useState({
    global: {
      value: "",
      matchMode: FilterMatchMode.CONTAINS,
    },
  });

  const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] =
    useState(false);

  const [isAddNew, setIsAddNew] = useState(false);

  const [visible, setVisible] = useState(false);

  const [popupHeaderTitle, setPopupHeaderTitle] = useState("New Branch");

  const [isSaving, setIsSaving] = useState(false);

  const currentKey = `/api/branch?show_all=${archivedAccess.canShowDeleted && isShowDeletedDataChecked}`;
  const agencyKey = "/api/agency?show_all=false";
  const stateKey = "/api/state?show_all=false";
  const cityKey = "/api/city?show_all=false";

  const {
    data: branchData,
    error,
    isLoading,
    isValidating,
    mutate: refreshBranchData,
  } = useSWR<Branch[]>(currentKey, fetcher);

  const {
    data: agencyData,
    error: agencyError,
    isLoading: agencyIsLoading,
    isValidating: agencyIsValidating,
    mutate: refreshAgencyData,
  } = useSWR<Agency[]>(agencyKey, fetcher);

  const {
    data: stateData,
    error: stateError,
    isLoading: stateIsLoading,
    isValidating: stateIsValidating,
    mutate: refreshStateData,
  } = useSWR<StateOption[]>(stateKey, fetcher);

  const {
    data: cityData,
    error: cityError,
    isLoading: cityIsLoading,
    isValidating: cityIsValidating,
    mutate: refreshCityData,
  } = useSWR<CityOption[]>(cityKey, fetcher);

  const { control, handleSubmit, setFocus, setValue, reset, clearErrors } =
    useForm<Branch>({
      defaultValues: EMPTY_BRANCH,
      mode: "onTouched",
    });

  const selectedStateId = useWatch({
    control,
    name: "state_id",
  });

  const activeAgencies = useMemo(
    () =>
      (agencyData ?? []).filter(
        (agency) => agency.is_active && !agency.deleted_at,
      ),
    [agencyData],
  );

  const activeStates = useMemo(
    () =>
      (stateData ?? []).filter(
        (state) => state.is_active !== false && !state.deleted_at,
      ),
    [stateData],
  );

  const activeCities = useMemo(
    () =>
      (cityData ?? []).filter(
        (city) => city.is_active !== false && !city.deleted_at,
      ),
    [cityData],
  );

  const filteredCities = useMemo(() => {
    const stateId = Number(selectedStateId);

    if (stateId <= 0) {
      return [];
    }

    return activeCities.filter((city) => Number(city.state_id) === stateId);
  }, [activeCities, selectedStateId]);

  const showSuccess = (message: string) => {
    dispatch(
      showToast({
        visible: true,
        severity: "success",
        summary: i18nT("static.udvru8"),
        detail: message,
      }),
    );
  };

  const showError = (err: unknown) => {
    if (isResponseTypeError(err)) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: i18nT("static.1vks92p"),
          detail: getErrorMessage(err, "message"),
        }),
      );

      return;
    }

    if (err instanceof Error) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: i18nT("static.1vks92p"),
          detail: err.message,
        }),
      );

      return;
    }

    dispatch(
      showToast({
        visible: true,
        severity: "error",
        summary: i18nT("static.1vks92p"),
        detail: i18nT("static.37lwsc"),
      }),
    );
  };

  const normalizeBranchForm = (data: Branch): Branch => {
    return {
      ...data,
      code: data.code.trim(),
      name: data.name.trim(),
      agency_id: data.agency_id ?? null,
      address: data.address?.trim() || null,
      postal_code: data.postal_code?.trim() || null,
      phone_number: data.phone_number?.trim() || null,
      fax_number: data.fax_number?.trim() || null,
      nitku_number: data.nitku_number?.trim() || null,
      npwp15_number: data.npwp15_number.trim(),
      npwp16_number: data.npwp16_number?.trim() || null,
    };
  };

  const handleCloseDialog = () => {
    setVisible(false);
    setSelectedData(null);
    setIsAddNew(false);
    setPopupHeaderTitle("New Branch");
    clearErrors();
    reset(EMPTY_BRANCH);
  };

  const handleRefresh = async () => {
    try {
      await Promise.all([
        refreshBranchData(),
        refreshAgencyData(),
        refreshStateData(),
        refreshCityData(),
      ]);
    } catch (err: unknown) {
      showError(err);
    }
  };

  const onGlobalFilterChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;

    setFilters({
      global: {
        value,
        matchMode: FilterMatchMode.CONTAINS,
      },
    });

    setGlobalFilterValue(value);
  };

  const onShowDeletedChange = (checked: boolean) => {
    setIsShowDeletedDataChecked(checked);
  };

  const onClickNew = () => {
    clearErrors();
    setSelectedData(null);
    setIsAddNew(true);
    setPopupHeaderTitle("New Branch");
    reset(EMPTY_BRANCH);
    setVisible(true);
  };

  const onClickUpdate = (data: Branch) => {
    clearErrors();
    setSelectedData(data);
    setIsAddNew(false);
    setPopupHeaderTitle("Edit Branch");

    reset({
      ...data,
      agency_id: data.agency_id ?? null,
      address: data.address ?? "",
      postal_code: data.postal_code ?? "",
      phone_number: data.phone_number ?? "",
      fax_number: data.fax_number ?? "",
      nitku_number: data.nitku_number ?? "",
      npwp15_number: data.npwp15_number ?? "",
      npwp16_number: data.npwp16_number ?? "",
      deleted_at: data.deleted_at ?? null,
    });

    setVisible(true);
  };

  const handleSubmitNew = async (data: Branch) => {
    try {
      setIsSaving(true);

      const response = await createBranch(normalizeBranchForm(data));

      await refreshBranchData();

      handleCloseDialog();

      showSuccess(response.message ?? i18nT("static.juyz2c"));
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (data: Branch) => {
    if (!selectedData) {
      showError(new Error("Branch data is not selected."));

      return;
    }

    try {
      setIsSaving(true);

      const response = await updateBranch(
        selectedData.id,
        selectedData.row_version,
        normalizeBranchForm(data),
      );

      await refreshBranchData();

      handleCloseDialog();

      showSuccess(response.message ?? i18nT("static.11ir0kr"));
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (data: Branch) => {
    try {
      const response = await deleteBranch(data.id, data.row_version);

      await refreshBranchData();

      showSuccess(response.message ?? i18nT("static.189vrah"));
    } catch (err: unknown) {
      showError(err);
    }
  };

  const handleRestore = async (data: Branch) => {
    try {
      const response = await restoreBranch(data.id, data.row_version);

      await refreshBranchData();

      showSuccess(response.message ?? i18nT("static.2ohqx0"));
    } catch (err: unknown) {
      showError(err);
    }
  };

  const handlePurge = async (data: Branch) => {
    try {
      const response = await purgeBranch(data.id);

      await refreshBranchData();

      showSuccess(response.message ?? i18nT("static.uub82h"));
    } catch (err: unknown) {
      showError(err);
    }
  };

  const onSubmit = async (data: Branch) => {
    if (isSaving) {
      return;
    }

    if (isAddNew) {
      await handleSubmitNew(data);
      return;
    }

    await handleUpdate(data);
  };

  const onClickDelete = (data: Branch) => {
    requestActionConfirmation({
      header: i18nT("static.1pabgge"),
      message: (
        <div className="flex flex-col gap-1">
          <span className="text-slate-600">{i18nT("static.1srnudn")} </span>

          <span className="font-semibold text-slate-800">{data.name}</span>
        </div>
      ),
      icon: "pi pi-exclamation-triangle",
      defaultFocus: "reject",
      accept: () => handleDelete(data),
      reject: () => undefined,
      footer: (options) => (
        <div className="flex flex-wrap justify-end gap-2 sm:gap-3">
          <Button
            type="button"
            label={i18nT("static.ew9em3")}
            icon="pi pi-times"
            text
            severity="secondary"
            onClick={options.reject}
          />

          <Button
            type="button"
            label={i18nT("static.oay2cq")}
            icon="pi pi-trash"
            severity="danger"
            onClick={options.accept}
          />
        </div>
      ),
    });
  };

  const onClickRestore = (data: Branch) => {
    requestActionConfirmation({
      header: i18nT("static.1orcol7"),
      message: (
        <div className="flex flex-col gap-1">
          <span className="text-slate-600">{i18nT("static.jgn3ti")} </span>

          <span className="font-semibold text-slate-800">{data.name}</span>
        </div>
      ),
      icon: "pi pi-refresh",
      defaultFocus: "accept",
      accept: () => handleRestore(data),
      reject: () => undefined,
      footer: (options) => (
        <div className="flex flex-wrap justify-end gap-2 sm:gap-3">
          <Button
            type="button"
            label={i18nT("static.ew9em3")}
            icon="pi pi-times"
            text
            severity="secondary"
            onClick={options.reject}
          />

          <Button
            type="button"
            label={i18nT("static.4fiyr5")}
            icon="pi pi-refresh"
            severity="success"
            onClick={options.accept}
          />
        </div>
      ),
    });
  };

  const onClickPurge = (data: Branch) => {
    requestActionConfirmation({
      header: i18nT("static.bs7tcf"),
      message: (
        <div className="flex flex-col gap-2">
          <span className="text-slate-600">{i18nT("static.1g8j1g8")} </span>

          <span className="font-semibold text-slate-800">{data.name}</span>
        </div>
      ),
      icon: "pi pi-exclamation-triangle",
      defaultFocus: "reject",
      accept: () => handlePurge(data),
      reject: () => undefined,
      footer: (options) => (
        <div className="flex flex-wrap justify-end gap-2 sm:gap-3">
          <Button
            type="button"
            label={i18nT("static.ew9em3")}
            icon="pi pi-times"
            text
            severity="secondary"
            onClick={options.reject}
          />

          <Button
            type="button"
            label={i18nT("static.1wopxwj")}
            icon="pi pi-trash"
            severity="danger"
            onClick={options.accept}
          />
        </div>
      ),
    });
  };

  const statusColumnBody = (rowData: Branch) => {
    if (rowData.deleted_at) {
      return (
        <Tag
          value={i18nT("static.1v6qcju")}
          severity="secondary"
          icon="pi pi-trash"
          rounded
        />
      );
    }

    if (rowData.is_active) {
      return (
        <Tag
          value={i18nT("static.8qzyhb")}
          severity="success"
          icon="pi pi-check-circle"
          rounded
        />
      );
    }

    return (
      <Tag
        value={i18nT("static.13zf5vc")}
        severity="warning"
        icon="pi pi-minus-circle"
        rounded
      />
    );
  };

  const textColumnBody = (value: string | null | undefined) => {
    if (!value) {
      return <span className="text-sm text-slate-400">-</span>;
    }

    return <span className="text-sm text-slate-700">{value}</span>;
  };

  const actionColumnBody = (rowData: Branch) => {
    const isDeleted = Boolean(rowData.deleted_at);

    const isSuperadmin = archivedAccess.canShowDeleted;

    if (isDeleted) {
      if (!isSuperadmin) {
        return (
          <span className="text-sm text-slate-400">
            {i18nT("static.yaeuo4")}
          </span>
        );
      }

      return (
        <div className="flex flex-nowrap items-center justify-end gap-2">
          {archivedAccess.canRestore && (
            <Button
              type="button"
              icon="pi pi-refresh"
              rounded
              outlined
              severity="success"
              size="small"
              tooltip={i18nT("static.4fiyr5")}
              tooltipOptions={{
                appendTo: getBody,
                position: "top",
              }}
              onClick={() => onClickRestore(rowData)}
            />
          )}

          {archivedAccess.canPurge && (
            <Button
              type="button"
              icon="pi pi-trash"
              rounded
              outlined
              severity="danger"
              size="small"
              tooltip={i18nT("static.1ny6sg3")}
              tooltipOptions={{
                appendTo: getBody,
                position: "top",
              }}
              onClick={() => onClickPurge(rowData)}
            />
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-nowrap items-center justify-end gap-2">
        <Button
          type="button"
          icon="pi pi-pencil"
          rounded
          outlined
          severity="secondary"
          size="small"
          tooltip={i18nT("static.1i1lcq9")}
          tooltipOptions={{
            appendTo: getBody,
            position: "top",
          }}
          onClick={() => onClickUpdate(rowData)}
        />

        <Button
          type="button"
          icon="pi pi-trash"
          rounded
          outlined
          severity="danger"
          size="small"
          tooltip={i18nT("static.oay2cq")}
          tooltipOptions={{
            appendTo: getBody,
            position: "top",
          }}
          onClick={() => onClickDelete(rowData)}
        />
      </div>
    );
  };

  const referenceDataLoading =
    agencyIsLoading || stateIsLoading || cityIsLoading;

  const referenceDataError =
    Boolean(agencyError) || Boolean(stateError) || Boolean(cityError);

  const allDataValidating =
    isValidating || agencyIsValidating || stateIsValidating || cityIsValidating;

  const dialogFooter = (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
      <Button
        type="button"
        label={i18nT("static.ew9em3")}
        icon="pi pi-times"
        text
        severity="secondary"
        disabled={isSaving}
        className="w-full sm:w-auto"
        onClick={handleCloseDialog}
      />

      <Button
        type="submit"
        form="branch-form"
        label={isAddNew ? i18nT("static.1hoxhxz") : i18nT("static.6gmm1l")}
        icon="pi pi-check"
        loading={isSaving}
        disabled={isSaving || referenceDataLoading || referenceDataError}
        className="w-full sm:w-auto"
      />
    </div>
  );

  if (isLoading) {
    return <LoadingDataTable />;
  }

  if (error) {
    return <ErrorNotConnectedToApi mutateKey={currentKey} />;
  }

  return (
    <>
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
          {/* Page Header */}
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:flex">
                <i className="pi pi-sitemap text-xl" />
              </div>

              <div className="min-w-0">
                <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
                  {i18nT("static.19gzx45")}{" "}
                </h1>

                <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                  {i18nT("static.1hwyvzt")}{" "}
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                type="button"
                label={i18nT("static.28r6qc")}
                icon="pi pi-refresh"
                severity="secondary"
                outlined
                size="small"
                loading={allDataValidating}
                disabled={allDataValidating}
                className="w-full sm:w-auto"
                onClick={handleRefresh}
              />

              <Button
                type="button"
                label={i18nT("static.pymfy3")}
                icon="pi pi-plus"
                size="small"
                className="w-full sm:w-auto"
                onClick={onClickNew}
              />
            </div>
          </div>

          {/* Table Toolbar */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {archivedAccess.canShowDeleted && (
              <div className="flex items-center gap-2">
                <Checkbox
                  inputId="showDeletedData"
                  checked={isShowDeletedDataChecked}
                  onChange={(event) =>
                    onShowDeletedChange(Boolean(event.checked))
                  }
                />

                <label
                  htmlFor="showDeletedData"
                  className="cursor-pointer select-none text-sm text-slate-600"
                >
                  {i18nT("static.1kk3in7")}{" "}
                </label>
              </div>
            )}

            <IconField iconPosition="left" className="w-full md:w-80">
              <InputIcon className="pi pi-search" />

              <InputText
                value={globalFilterValue}
                onChange={onGlobalFilterChange}
                placeholder={i18nT("static.1baau78")}
                className="w-full"
              />
            </IconField>
          </div>

          {/* Branch Table */}
          <div className="w-full overflow-hidden">
            <DataTable
              value={branchData ?? []}
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
              paginator
              rows={10}
              rowsPerPageOptions={[10, 25, 50]}
              stripedRows
              rowHover
              scrollable
              removableSort
              responsiveLayout="scroll"
              size="small"
              loading={isValidating}
              tableStyle={{
                minWidth: "86rem",
              }}
              emptyMessage={i18nT("static.bm18l8")}
              currentPageReportTemplate={i18nT("static.1kqh8lr")}
              paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            >
              <Column
                header="#"
                body={(_, options) => options.rowIndex + 1}
                headerStyle={{
                  width: "4rem",
                }}
                bodyStyle={{
                  width: "4rem",
                }}
              />

              <Column
                field="code"
                header={i18nT("static.xoaiok")}
                sortable
                style={{
                  minWidth: "10rem",
                }}
                body={(rowData: Branch) => (
                  <span className="font-mono text-sm font-semibold text-slate-700">
                    {rowData.code}
                  </span>
                )}
              />

              <Column
                field="name"
                header={i18nT("static.1k4s2ws")}
                sortable
                style={{
                  minWidth: "18rem",
                }}
                body={(rowData: Branch) => (
                  <span className="font-medium text-slate-800">
                    {rowData.name}
                  </span>
                )}
              />

              <Column
                field="agency_name"
                header={i18nT("static.1v3zejm")}
                sortable
                style={{
                  minWidth: "16rem",
                }}
                body={(rowData: Branch) => textColumnBody(rowData.agency_name)}
              />

              <Column
                field="state_name"
                header={i18nT("static.1pevyth")}
                sortable
                style={{
                  minWidth: "16rem",
                }}
                body={(rowData: Branch) => textColumnBody(rowData.state_name)}
              />

              <Column
                field="city_name"
                header={i18nT("static.142k4ma")}
                sortable
                style={{
                  minWidth: "14rem",
                }}
                body={(rowData: Branch) => textColumnBody(rowData.city_name)}
              />

              <Column
                field="phone_number"
                header={i18nT("static.kb2lhr")}
                sortable
                style={{
                  minWidth: "13rem",
                }}
                body={(rowData: Branch) => textColumnBody(rowData.phone_number)}
              />

              <Column
                field="npwp15_number"
                header={i18nT("static.14gfv0m")}
                sortable
                style={{
                  minWidth: "15rem",
                }}
                body={(rowData: Branch) =>
                  textColumnBody(rowData.npwp15_number)
                }
              />

              <Column
                field="is_active"
                header={i18nT("static.3pd73")}
                sortable
                body={statusColumnBody}
                style={{
                  minWidth: "10rem",
                }}
              />

              <Column
                header={i18nT("static.2wk0tb")}
                body={actionColumnBody}
                frozen
                alignFrozen="right"
                headerClassName="bg-white"
                bodyClassName="bg-white"
                headerStyle={{
                  width: "9rem",
                  minWidth: "9rem",
                  textAlign: "right",
                }}
                bodyStyle={{
                  width: "9rem",
                  minWidth: "9rem",
                }}
              />
            </DataTable>
          </div>
        </div>
      </Card>

      {/* Branch Form Dialog */}
      <Dialog
        header={popupHeaderTitle}
        visible={visible}
        style={{
          width: "95vw",
          maxWidth: "68rem",
        }}
        breakpoints={{
          "960px": "90vw",
          "640px": "95vw",
        }}
        footer={dialogFooter}
        modal
        draggable={false}
        resizable={false}
        closeOnEscape={!isSaving}
        closable={!isSaving}
        onHide={handleCloseDialog}
        onShow={() => {
          setTimeout(() => {
            setFocus("code");
          }, 0);
        }}
      >
        <form
          id="branch-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-6 pt-2"
        >
          {/* Basic Information */}
          <section className="flex flex-col gap-4">
            <div className="border-b border-slate-200 pb-2">
              <h2 className="m-0 text-sm font-semibold text-slate-800">
                {i18nT("static.20pywr")}{" "}
              </h2>

              <p className="m-0 mt-1 text-xs text-slate-500">
                {i18nT("static.1doiacy")}{" "}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="code"
                  className="text-sm font-medium text-slate-700"
                >
                  {i18nT("static.1m3zsjy")}{" "}
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <Controller
                  name="code"
                  control={control}
                  rules={{
                    required: i18nT("static.1wibi47"),
                    validate: {
                      noSpaces: (value) =>
                        !/\s/.test(value) ||
                        "Branch code must not contain spaces.",
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <InputText
                        {...field}
                        id="code"
                        autoComplete="off"
                        placeholder={i18nT("static.1ssx5j3")}
                        className={`w-full ${
                          fieldState.invalid ? "p-invalid" : ""
                        }`}
                      />

                      {fieldState.error ? (
                        <small className="p-error">
                          {fieldState.error.message}
                        </small>
                      ) : (
                        <small className="text-slate-500">
                          {i18nT("static.16bmalk")}{" "}
                        </small>
                      )}
                    </>
                  )}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="name"
                  className="text-sm font-medium text-slate-700"
                >
                  {i18nT("static.1k4s2ws")}{" "}
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <Controller
                  name="name"
                  control={control}
                  rules={{
                    required: i18nT("static.16cooo9"),
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <InputText
                        {...field}
                        id="name"
                        autoComplete="off"
                        placeholder={i18nT("static.1lu0enh")}
                        className={`w-full ${
                          fieldState.invalid ? "p-invalid" : ""
                        }`}
                      />

                      {fieldState.error && (
                        <small className="p-error">
                          {fieldState.error.message}
                        </small>
                      )}
                    </>
                  )}
                />
              </div>

              <div className="flex flex-col gap-2 md:col-span-2">
                <label
                  htmlFor="agency_id"
                  className="text-sm font-medium text-slate-700"
                >
                  {i18nT("static.1v3zejm")}{" "}
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <Controller
                  name="agency_id"
                  control={control}
                  rules={{
                    required: i18nT("static.18iyzsr"),
                    validate: (value) =>
                      Number(value) > 0 || "Agency is required.",
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <Dropdown
                        id="agency_id"
                        appendTo={getBody}
                        value={field.value ?? null}
                        options={activeAgencies}
                        optionLabel="name"
                        optionValue="id"
                        filter
                        loading={agencyIsLoading}
                        disabled={agencyIsLoading || Boolean(agencyError)}
                        placeholder={
                          agencyIsLoading
                            ? i18nT("static.1d0yjf4")
                            : i18nT("static.8xl90r")
                        }
                        className={`w-full ${
                          fieldState.invalid ? "p-invalid" : ""
                        }`}
                        onChange={(event) => field.onChange(event.value)}
                      />

                      {fieldState.error && (
                        <small className="p-error">
                          {fieldState.error.message}
                        </small>
                      )}

                      {!fieldState.error && !agencyError && (
                        <small className="text-slate-500">
                          {i18nT("static.1w9hrv3")}{" "}
                        </small>
                      )}

                      {agencyError && (
                        <small className="p-error">
                          {i18nT("static.xmhi49")}{" "}
                        </small>
                      )}
                    </>
                  )}
                />
              </div>
            </div>
          </section>

          {/* Location */}
          <section className="flex flex-col gap-4">
            <div className="border-b border-slate-200 pb-2">
              <h2 className="m-0 text-sm font-semibold text-slate-800">
                {i18nT("static.pghiva")}{" "}
              </h2>

              <p className="m-0 mt-1 text-xs text-slate-500">
                {i18nT("static.15ijlfc")}{" "}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="state_id"
                  className="text-sm font-medium text-slate-700"
                >
                  {i18nT("static.1pevyth")}{" "}
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <Controller
                  name="state_id"
                  control={control}
                  rules={{
                    required: i18nT("static.1jcmnlq"),
                    validate: (value) =>
                      Number(value) > 0 || "Province / state is required.",
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <Dropdown
                        id="state_id"
                        appendTo={getBody}
                        value={field.value || null}
                        options={activeStates}
                        optionLabel="name"
                        optionValue="id"
                        filter
                        loading={stateIsLoading}
                        disabled={stateIsLoading || Boolean(stateError)}
                        placeholder={
                          stateIsLoading
                            ? i18nT("static.mtgucg")
                            : i18nT("static.f1tobm")
                        }
                        className={`w-full ${
                          fieldState.invalid ? "p-invalid" : ""
                        }`}
                        onChange={(event) => {
                          field.onChange(event.value);

                          setValue("city_id", 0, {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                        }}
                      />

                      {fieldState.error && (
                        <small className="p-error">
                          {fieldState.error.message}
                        </small>
                      )}

                      {stateError && (
                        <small className="p-error">
                          {i18nT("static.i2qd6x")}{" "}
                        </small>
                      )}
                    </>
                  )}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="city_id"
                  className="text-sm font-medium text-slate-700"
                >
                  {i18nT("static.142k4ma")}{" "}
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <Controller
                  name="city_id"
                  control={control}
                  rules={{
                    required: i18nT("static.j4gfy3"),
                    validate: (value) =>
                      Number(value) > 0 || "City is required.",
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <Dropdown
                        id="city_id"
                        appendTo={getBody}
                        value={field.value || null}
                        options={filteredCities}
                        optionLabel="name"
                        optionValue="id"
                        filter
                        loading={cityIsLoading}
                        disabled={
                          !selectedStateId ||
                          Number(selectedStateId) <= 0 ||
                          cityIsLoading ||
                          Boolean(cityError)
                        }
                        placeholder={
                          cityIsLoading
                            ? i18nT("static.1ndgecw")
                            : Number(selectedStateId) > 0
                              ? i18nT("static.1rnb3r5")
                              : i18nT("static.1cicnnh")
                        }
                        className={`w-full ${
                          fieldState.invalid ? "p-invalid" : ""
                        }`}
                        onChange={(event) => field.onChange(event.value)}
                      />

                      {fieldState.error && (
                        <small className="p-error">
                          {fieldState.error.message}
                        </small>
                      )}

                      {cityError && (
                        <small className="p-error">
                          {i18nT("static.fb9czd")}{" "}
                        </small>
                      )}
                    </>
                  )}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="postal_code"
                  className="text-sm font-medium text-slate-700"
                >
                  {i18nT("static.1mbis3")}{" "}
                </label>

                <Controller
                  name="postal_code"
                  control={control}
                  render={({ field }) => (
                    <>
                      <InputText
                        {...field}
                        value={field.value ?? ""}
                        id="postal_code"
                        autoComplete="off"
                        placeholder={i18nT("static.74dkl8")}
                        className="w-full"
                      />

                      <small className="text-slate-500">
                        {i18nT("static.6z0n83")}{" "}
                      </small>
                    </>
                  )}
                />
              </div>

              <div className="flex flex-col gap-2 md:col-span-2">
                <label
                  htmlFor="address"
                  className="text-sm font-medium text-slate-700"
                >
                  {i18nT("static.v2y2ur")}{" "}
                </label>

                <Controller
                  name="address"
                  control={control}
                  render={({ field }) => (
                    <>
                      <InputTextarea
                        {...field}
                        value={field.value ?? ""}
                        id="address"
                        rows={3}
                        autoResize
                        placeholder={i18nT("static.17d31nn")}
                        className="w-full"
                      />

                      <small className="text-slate-500">
                        {i18nT("static.qm4dy1")}{" "}
                      </small>
                    </>
                  )}
                />
              </div>
            </div>
          </section>

          {/* Contact and Tax */}
          <section className="flex flex-col gap-4">
            <div className="border-b border-slate-200 pb-2">
              <h2 className="m-0 text-sm font-semibold text-slate-800">
                {i18nT("static.vrwdf4")}{" "}
              </h2>

              <p className="m-0 mt-1 text-xs text-slate-500">
                {i18nT("static.nmgqi9")}{" "}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="phone_number"
                  className="text-sm font-medium text-slate-700"
                >
                  {i18nT("static.1v8ev2w")}{" "}
                </label>

                <Controller
                  name="phone_number"
                  control={control}
                  render={({ field }) => (
                    <InputText
                      {...field}
                      value={field.value ?? ""}
                      id="phone_number"
                      autoComplete="off"
                      placeholder={i18nT("static.1byfk5h")}
                      className="w-full"
                    />
                  )}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="fax_number"
                  className="text-sm font-medium text-slate-700"
                >
                  {i18nT("static.uh7mkh")}{" "}
                </label>

                <Controller
                  name="fax_number"
                  control={control}
                  render={({ field }) => (
                    <InputText
                      {...field}
                      value={field.value ?? ""}
                      id="fax_number"
                      autoComplete="off"
                      placeholder={i18nT("static.13a3x8n")}
                      className="w-full"
                    />
                  )}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="nitku_number"
                  className="text-sm font-medium text-slate-700"
                >
                  {i18nT("static.jqt821")}{" "}
                </label>

                <Controller
                  name="nitku_number"
                  control={control}
                  render={({ field }) => (
                    <InputText
                      {...field}
                      value={field.value ?? ""}
                      id="nitku_number"
                      autoComplete="off"
                      placeholder={i18nT("static.1n3erj3")}
                      className="w-full"
                    />
                  )}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="npwp15_number"
                  className="text-sm font-medium text-slate-700"
                >
                  {i18nT("static.kcddkv")}{" "}
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <Controller
                  name="npwp15_number"
                  control={control}
                  rules={{
                    required: i18nT("static.1o34sqc"),
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <InputText
                        {...field}
                        value={field.value ?? ""}
                        id="npwp15_number"
                        autoComplete="off"
                        placeholder={i18nT("static.opwcbh")}
                        className={`w-full ${
                          fieldState.invalid ? "p-invalid" : ""
                        }`}
                      />

                      {fieldState.error && (
                        <small className="p-error">
                          {fieldState.error.message}
                        </small>
                      )}
                    </>
                  )}
                />
              </div>

              <div className="flex flex-col gap-2 md:col-span-2">
                <label
                  htmlFor="npwp16_number"
                  className="text-sm font-medium text-slate-700"
                >
                  {i18nT("static.1ot0cqc")}{" "}
                </label>

                <Controller
                  name="npwp16_number"
                  control={control}
                  render={({ field }) => (
                    <>
                      <InputText
                        {...field}
                        value={field.value ?? ""}
                        id="npwp16_number"
                        autoComplete="off"
                        placeholder={i18nT("static.yiyg1y")}
                        className="w-full"
                      />

                      <small className="text-slate-500">
                        {i18nT("static.whe13e")}{" "}
                      </small>
                    </>
                  )}
                />
              </div>
            </div>
          </section>

          {/* Active Status */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Controller
              name="is_active"
              control={control}
              defaultValue
              render={({ field }) => (
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <label
                      htmlFor="is_active"
                      className="cursor-pointer text-sm font-medium text-slate-700"
                    >
                      {i18nT("static.almk4n")}{" "}
                    </label>

                    <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                      {i18nT("static.1lkpbul")}{" "}
                    </p>
                  </div>

                  <InputSwitch
                    id="is_active"
                    checked={Boolean(field.value)}
                    onChange={(event) => field.onChange(event.value)}
                  />
                </div>
              )}
            />
          </div>
        </form>
      </Dialog>
    </>
  );
};

export default BranchTableData;
