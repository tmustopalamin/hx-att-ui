'use client'

import { Card } from 'primereact/card'
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { FilterMatchMode } from 'primereact/api';
import { Button } from 'primereact/button';
import CardTitle from '@/app/_components/CardTitle';
import { ConfirmDialog } from 'primereact/confirmdialog';
import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/app/utils/fetcher';
import ErrorNotConnectedToApi from '@/app/_components/ErrorNotConnectedToApi';
import LoadingDataTable from '@/app/_components/LoadingDataTable';
import dayjs from 'dayjs';
import { AttendanceSummary } from '@/app/types/attendance-summary';

const RunPayrollTableData = () => {
  // const profileState = useSelector((state: RootState) => state.profile);
  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const [filters, setFilters] = useState({
    global: { value: '', matchMode: FilterMatchMode.CONTAINS },
  });
  const [isFetchData, setIsFetchData] = useState(false);

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const _filters = { ...filters };

    _filters['global'].value = value;

    setFilters(_filters);
    setGlobalFilterValue(value);
  };

  const { data: AttendanceSummaryData, error, isLoading, mutate } = useSWR<AttendanceSummary[]>(`/api/run-payroll?is_fetch_data=${isFetchData}`, fetcher, {
    revalidateOnFocus: false,
  });

  if (isLoading) return <LoadingDataTable />;
  // if (error) {
  //   return <ErrorNotConnectedToApi mutateKey='/api/run-payroll' />
  // }

  // const activeColumnBody = (rowData: AttendanceSummary) => {
  //   return rowData.is_active ? (
  //     <Tag value="Active" severity="success" />
  //   ) : (
  //     <Tag value="Inactive" severity="danger" />
  //   );
  // };

  const onClickGetData = () => {
    setIsFetchData(true)
    mutate();
  };

  // const actionColumnBody = (rowData: AttendanceSummary) => {
  //   console.log(rowData);

  //   return <>
  //     <div className="flex gap-2">
  //       {/* {hasRole(profileState.role, ["superadmin"]) && <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='delete forever' rounded severity='secondary' label="" icon="pi pi-times" size="small" onClick={() => { onClickPurge(rowData) }} />}

  //       {hasRole(profileState.role, ["superadmin"]) && rowData.deleted_at && <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='restore' rounded severity='success' label="" icon="pi pi-refresh" size="small" onClick={() => { onClickRestore(rowData) }} />}

  //       {!rowData.deleted_at && <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='delete' rounded severity='danger' label="" icon="pi pi-trash" size="small" onClick={() => { onClickDelete(rowData) }} />} */}

  //       {/* <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='update' rounded severity='help' label="" icon="pi pi-pencil" size="small" onClick={() => { }} /> */}
  //     </div>
  //   </>
  // };

  const checkInColumnBody = (rowData: AttendanceSummary) => {
    const check_in_time = dayjs(rowData.check_in_time).isValid() ? dayjs(rowData.check_in_time).format("DD-MM-YYYY HH:mm") : '';
    return <>{check_in_time}</>
  }

  const checkOutColumnBody = (rowData: AttendanceSummary) => {
    const check_out_time = dayjs(rowData.check_out_time).isValid() ? dayjs(rowData.check_out_time).format("DD-MM-YYYY HH:mm") : '';
    return <>{check_out_time}</>
  }

  const whColumnBody = (rowData: AttendanceSummary) => {
    const workHours = rowData.work_hours ?? 0;

    const hours = Math.floor(workHours / 3600);
    const minutes = Math.floor((workHours % 3600) / 60);

    return `${hours}j ${minutes}m`;
  };

  const lateColumnBody = (rowData: AttendanceSummary) => {
    const late_text = rowData.is_late ? 'Yes' : 'No'
    return `${late_text}`;
  }

  const earlyCoColumnBody = (rowData: AttendanceSummary) => {
    const early_co_text = rowData.is_early_co ? 'Yes' : 'No'
    return `${early_co_text}`;
  }

  return (
    <>
      <ConfirmDialog />
      <Card title={<CardTitle title='Attendance Summary' url='' />}>
        <div className="p-3 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button loading={isLoading} loadingIcon="pi pi-plus" label="Process Data" icon="pi pi-refresh" size="small" onClick={() => { onClickGetData() }} />
            </div>

            <IconField iconPosition="left">
              <InputIcon className="pi pi-search" />
              <InputText className="p-inputtext-sm" value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Keyword Search" />
            </IconField>
          </div>

          <DataTable
            value={AttendanceSummaryData}
            tableStyle={{ minWidth: "50rem" }}
            stripedRows
            paginator
            scrollable
            scrollHeight="500px"
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            dataKey="id"
            globalFilterFields={['name']}
            emptyMessage="No AttendanceSummary found."
            header={<></>}
            filters={filters}
            currentPageReportTemplate="{first} to {last} of {totalRecords}"
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            loading={isLoading}
          >
            <Column header="#" headerStyle={{ width: '3rem' }} body={(data, options) => options.rowIndex + 1}></Column>
            <Column field="full_name" header="Employee"></Column>
            <Column field="summary_date" header="Date"></Column>
            <Column field="shift_name" header="Shift"></Column>
            <Column header="Check In" body={checkInColumnBody}></Column>
            <Column header="Check Out" body={checkOutColumnBody}></Column>
            <Column header="Work Hours" body={whColumnBody}></Column>
            <Column field="status" header="Status"></Column>
            <Column header="Late" body={lateColumnBody}></Column>
            <Column header="Early Check out" body={earlyCoColumnBody}></Column>
            <Column field="overtime_hours" header="Overtime"></Column>
          </DataTable>
        </div>
      </Card>
    </>
  )
}

export default RunPayrollTableData