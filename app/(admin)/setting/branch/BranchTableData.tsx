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
import { InputMask } from 'primereact/inputmask';
import { RootState } from '@/store/store';
import { hasRole } from '@/app/utils/role-utils';
import { Branch } from '@/app/types/branch';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { createBranch, deleteBranch, purgeBranch, restoreBranch, updateBranch } from '@/app/services/branch-service';


const BranchTableData = () => {
  const dispatch = useDispatch();
  const profileState = useSelector((state: RootState) => state.profile);
  const [selectedData, setSelectedData] = useState<Branch | null>(null);
  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const [filters, setFilters] = useState({
    global: { value: '', matchMode: FilterMatchMode.CONTAINS },
  });
  const [isAddNew, setIsAddNew] = useState(false);
  const [visible, setVisible] = useState(false);
  const [popupHeaderTitle, setPopupHeaderTitle] = useState('');
  const { control, handleSubmit, setFocus, formState: { isValid }, reset, clearErrors, watch } = useForm<Branch>();
  const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] = useState(false);

  const { data: dataBranch, error, isLoading } = useSWR<Branch[]>(`/api/branch?show_all=${isShowDeletedDataChecked}`, fetcher);

  if (isLoading) return <LoadingDataTable />;
  if (error) return <ErrorNotConnectedToApi mutateKey='/api/branch?show_all=true' />

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const _filters = { ...filters };
    _filters['global'].value = value;
    setFilters(_filters);
    setGlobalFilterValue(value);
  };

  const onIngredientsChange = () => {
    setIsShowDeletedDataChecked(!isShowDeletedDataChecked)
  }

  const onClickNew = () => {
    clearErrors();
    setIsAddNew(true);
    setVisible(true);
    setPopupHeaderTitle("New Branch");
    reset({
      id: 0,
      code: '',
      name: '',
      is_active: true,
      deleted_at: '',
      row_version: 0,
    });
  }

  const footerContent = (
    <div className='text-right flex gap-5 justify-end'>
      <Button type="button" label="Cancel" icon="pi pi-times" onClick={() => { setVisible(false); }} className="p-button-text" />
      <Button type="submit" label={isAddNew ? "Submit" : "Save"} icon="pi pi-check" />
    </div>
  );

  const handleSubmitNew = async (data: Branch) => {
    const res: ResponseType<ResponseTypeCreateSuccess> = await createBranch(data);
    setVisible(false);
    reset();
    mutate(`/api/branch?show_all=${isShowDeletedDataChecked}`);
    dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
  }

  const handleUpdate = async (data: Branch) => {
    if (!selectedData) return;
    const res: ResponseType<ResponseTypeCreateSuccess> = await updateBranch(selectedData.id, selectedData.row_version, data);
    setVisible(false);
    mutate(`/api/branch?show_all=${isShowDeletedDataChecked}`);
    dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    reset();
  }

  const handleDelete = async (data: Branch) => {
    const res: ResponseType<ResponseTypeCreateSuccess> = await deleteBranch(data.id, data.row_version);
    mutate(`/api/branch?show_all=${isShowDeletedDataChecked}`);
    dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
  }

  const onSubmit = (data: Branch) => {
    if (!isValid) return;

    if (isAddNew) {
      handleSubmitNew(data);
      return;
    }

    if (selectedData) {
      handleUpdate(data);
    }
  };

  const activeColumnBody = (rowData: Branch) => {
    return rowData.is_active
      ? <Tag value="Active" severity="success" />
      : <Tag value="Inactive" severity="danger" />;
  };

  const actionColumnBody = (rowData: Branch) => {
    return (
      <div className="flex gap-2">
        <Button rounded severity='danger' icon="pi pi-trash" size="small" onClick={() => handleDelete(rowData)} />
        <Button rounded severity='help' icon="pi pi-pencil" size="small" onClick={() => {
          setVisible(true);
          setIsAddNew(false);
          setPopupHeaderTitle('Update Branch');
          reset(rowData);
          setSelectedData(rowData);
        }} />
      </div>
    );
  };

  return (
    <>
      <ConfirmDialog />

      <Card>
        <div className="p-4 flex flex-col gap-4">

          {/* HEADER */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b pb-3">
            <div>
              <div className="text-2xl font-semibold">Branch</div>
              <div className="text-sm text-gray-500">
                Manage company branch master data
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
            value={dataBranch}
            stripedRows
            paginator
            scrollable
            scrollHeight="500px"
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            dataKey="id"
            filters={filters}
            globalFilterFields={['code', 'name']}
            loading={isLoading}
          >
            <Column header="#" body={(data, options) => options.rowIndex + 1}></Column>
            <Column field="code" header="Code"></Column>
            <Column field="name" header="Name"></Column>
            <Column field="is_active" header="Active" body={activeColumnBody}></Column>
            <Column header="Action" body={(rowData) => actionColumnBody(rowData)}></Column>
          </DataTable>

        </div>
      </Card>

      {/* DIALOG */}
      <form onSubmit={handleSubmit((data) => onSubmit(data))}>
        <Dialog
          header={popupHeaderTitle}
          visible={visible}
          style={{ width: '50vw' }}
          onHide={() => { setVisible(false); reset(); }}
          footer={footerContent}
          onShow={() => setFocus('name')}
        >
          {/* FORM kamu biarkan sama seperti sebelumnya */}
        </Dialog>
      </form>
    </>
  )
}

export default BranchTableData