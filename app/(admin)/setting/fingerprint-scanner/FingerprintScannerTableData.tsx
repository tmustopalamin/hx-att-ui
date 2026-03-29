'use client'

import { Card } from 'primereact/card'
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { FilterMatchMode } from 'primereact/api';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Controller, useForm } from 'react-hook-form';
import CardTitle from '@/app/_components/CardTitle';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import { InputSwitch } from 'primereact/inputswitch';
import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { fetcher } from '@/app/utils/fetcher';
import { ResponseType, ResponseTypeCreateSuccess } from '@/app/types/response-type';
import LoadingDataTable from '@/app/_components/LoadingDataTable';
import ErrorNotConnectedToApi from '@/app/_components/ErrorNotConnectedToApi';
import { isResponseTypeError, getErrorMessage } from '@/app/utils/error-messages';
import { showToast } from '@/store/ToastSlice';
import { useDispatch, useSelector } from 'react-redux';
import { Tag } from 'primereact/tag';
import { Checkbox } from 'primereact/checkbox';
import { RootState } from '@/store/store';
import { hasRole } from '@/app/utils/role-utils';
import {
  createFingerprintScanner,
  updateFingerprintScanner,
  deleteFingerprintScanner,
  purgeFingerprintScanner,
  restoreFingerprintScanner,
  checkConnectionFingerprintScanner
} from '@/app/services/fingerprintscanner-service';
import { FingerprintScanner } from '@/app/types/fingerprint-scanner';

const FingerprintScannerTableData = () => {
  const dispatch = useDispatch();
  const profileState = useSelector((state: RootState) => state.profile);

  // ================= HOOKS (HARUS DI ATAS SEMUA) =================
  const [selectedData, setSelectedData] = useState<FingerprintScanner | null>(null);
  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const [filters, setFilters] = useState({
    global: { value: '', matchMode: FilterMatchMode.CONTAINS },
  });
  const [isAddNew, setIsAddNew] = useState(false);
  const [visible, setVisible] = useState(false);
  const [popupHeaderTitle, setPopupHeaderTitle] = useState('');
  const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] = useState(false);
  const [checkLoading, setCheckloading] = useState(false);

  const { control, handleSubmit, setFocus, formState: { isValid }, reset, clearErrors } = useForm<FingerprintScanner>();

  const { data: FingerprintScannerData, error, isLoading } =
    useSWR<FingerprintScanner[]>(`/api/fingerprint-scanner?show_all=${isShowDeletedDataChecked}`, fetcher);

  // ================= AFTER ALL HOOKS =================
  if (isLoading) return <LoadingDataTable />;
  if (error) return <ErrorNotConnectedToApi mutateKey='/api/fingerprint-scanner?show_all=true' />;

  // ================= FUNCTIONS =================
  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const _filters = { ...filters };
    _filters['global'].value = value;

    setFilters(_filters);
    setGlobalFilterValue(value);
  };

  const onClickNew = () => {
    clearErrors();
    setIsAddNew(true);
    setVisible(true);
    setPopupHeaderTitle("New FingerprintScanner");
    reset({
      id: 0,
      code: '',
      name: '',
      ip: '',
      port: '',
      password: '',
      is_active: true,
      deleted_at: '',
      row_version: 0,
    });
  }

  const onIngredientsChange = () => {
    setIsShowDeletedDataChecked(!isShowDeletedDataChecked)
  }

  const handleSubmitNew = async (data: FingerprintScanner) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await createFingerprintScanner(data);
      setVisible(false);
      reset();
      mutate(`/api/fingerprint-scanner?show_all=${isShowDeletedDataChecked}`);
      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  }

  const handleUpdate = async (data: FingerprintScanner) => {
    if (!selectedData) {
      dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: "please select data" }));
      return;
    }

    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await updateFingerprintScanner(selectedData.id, selectedData.row_version, data)

      setVisible(false);
      mutate(`/api/fingerprint-scanner?show_all=${isShowDeletedDataChecked}`);
      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
      reset();
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  }

  const handleDelete = async (data: FingerprintScanner) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await deleteFingerprintScanner(data.id, data.row_version);

      mutate(`/api/fingerprint-scanner?show_all=${isShowDeletedDataChecked}`);
      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  }

  const handlePurge = async (data: FingerprintScanner) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await purgeFingerprintScanner(data.id);

      mutate(`/api/fingerprint-scanner?show_all=${isShowDeletedDataChecked}`);
      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  }

  const handleRestore = async (data: FingerprintScanner) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await restoreFingerprintScanner(data.id, data.row_version);

      mutate(`/api/fingerprint-scanner?show_all=${isShowDeletedDataChecked}`);
      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  }

  const onClickCheckConnection = async (data: FingerprintScanner) => {
    setCheckloading(true)

    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await checkConnectionFingerprintScanner(data);

      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }

    setCheckloading(false)
  }

  const onSubmit = (data: FingerprintScanner) => {
    data.port = String(data.port)

    if (!isValid) return;

    if (isAddNew) {
      handleSubmitNew(data);
      return;
    }

    if (selectedData) {
      handleUpdate(data);
    }
  };

  const activeColumnBody = (rowData: FingerprintScanner) => {
    return rowData.is_active
      ? <Tag value="Active" severity="success" />
      : <Tag value="Inactive" severity="danger" />;
  };

  const actionColumnBody = (rowData: FingerprintScanner) => {
    return (
      <div className="flex gap-2">
        <Button rounded severity='danger' icon="pi pi-trash" size="small"
          onClick={() => handleDelete(rowData)} />

        <Button rounded severity='help' icon="pi pi-pencil" size="small"
          onClick={() => {
            setVisible(true);
            setIsAddNew(false);
            setPopupHeaderTitle('Update FingerprintScanner');
            reset(rowData);
            setSelectedData(rowData);
          }} />

        <Button rounded severity='warning' icon="pi pi-lightbulb"
          loading={checkLoading}
          size="small"
          onClick={() => onClickCheckConnection(rowData)} />
      </div>
    )
  };

  return (
    <>
      <ConfirmDialog />

      <Card>
        <div className="p-4 flex flex-col gap-4">

          {/* HEADER */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b pb-3">
            <div>
              <div className="text-2xl font-semibold">Fingerprint Scanner Device</div>
              <div className="text-sm text-gray-500">
                Manage fingerprint scanner device master data
              </div>
            </div>

            <div className="flex items-center gap-5">

              <div className="flex align-items-center pl-5">
                <Checkbox inputId="showDeletedData" name="showDeletedData" value="yes" onChange={onIngredientsChange} checked={isShowDeletedDataChecked} />
                <label htmlFor="showDeletedData" className="ml-2">show deleted data</label>
              </div>

              <IconField iconPosition="left">
                <InputIcon className="pi pi-search" />
                <InputText className="p-inputtext-sm" value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Keyword Search" />
              </IconField>

              <Button label="New" icon="pi pi-plus" size="small" onClick={() => { onClickNew() }} />
            </div>
          </div>

          {/* TABLE */}
          <DataTable
            value={FingerprintScannerData}
            paginator
            rows={10}
            filters={filters}
          >
            <Column header="#" body={(data, options) => options.rowIndex + 1}></Column>
            <Column field="code" header="Code"></Column>
            <Column field="name" header="Name"></Column>
            <Column field="is_active" header="Active" body={activeColumnBody}></Column>
            <Column header="Action" body={actionColumnBody}></Column>
          </DataTable>

        </div>
      </Card>

      <form onSubmit={handleSubmit((data) => onSubmit(data))}>
        <Dialog
          header={popupHeaderTitle}
          visible={visible}
          style={{ width: '50vw' }}
          onHide={() => setVisible(false)}
          onShow={() => setFocus('name')}
        >
          <div className="flex flex-col gap-5">

            <Controller name="code" control={control}
              render={({ field }) => <InputText {...field} placeholder='Code' />} />

            <Controller name="name" control={control}
              render={({ field }) => <InputText {...field} placeholder='Name' />} />

            <Controller name="ip" control={control}
              render={({ field }) => <InputText {...field} placeholder='IP' />} />

            <Controller name="port" control={control}
              render={({ field }) => <InputText {...field} placeholder='Port' />} />

            <Controller name="password" control={control}
              render={({ field }) => <InputText {...field} placeholder='Password' />} />

            <Controller name="is_active" control={control}
              render={({ field }) =>
                <InputSwitch checked={field.value}
                  onChange={(e) => field.onChange(e.value)} />
              } />
          </div>
        </Dialog>
      </form>
    </>
  )
}

export default FingerprintScannerTableData