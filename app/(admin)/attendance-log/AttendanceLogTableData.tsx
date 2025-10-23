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
// import { Tag } from 'primereact/tag';
import { AttendanceLog } from '@/app/types/attendance-log';
import ErrorNotConnectedToApi from '@/app/_components/ErrorNotConnectedToApi';
import LoadingDataTable from '@/app/_components/LoadingDataTable';
import dayjs from 'dayjs';

const AttendanceLogTableData = () => {
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

  const { data: AttendanceLogData, error, isLoading, mutate } = useSWR<AttendanceLog[]>(`/api/attendance-log?is_fetch_data=${isFetchData}`, fetcher, {
    revalidateOnFocus: false,
  });

  if (isLoading) return <LoadingDataTable />;
  if (error) {
    return <ErrorNotConnectedToApi mutateKey='/api/attendance-log' />
  }

  // const activeColumnBody = (rowData: AttendanceLog) => {
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


  // const actionColumnBody = (rowData: AttendanceLog) => {
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

  const sourceColumnBody = (rowData: AttendanceLog) => {
    return <>
      <div className="">
        {rowData.source_type} {rowData.machine_name}
      </div>
    </>
  }

  const coordsColumnBody = (rowData: AttendanceLog) => {
    return <>
      <div className="">
        {rowData.latitude} / {rowData.longitude}
      </div>
    </>
  }

  const photoColumnBody = (rowData: AttendanceLog) => {
    const url = `http://localhost:3050/public/upload/attendance/${rowData.photo_url}`;

    return <>
      {rowData.photo_url && (
        <div className="underline">
          <a href={url} target="_blank">View</a>
        </div>
      )}
    </>
  }

  const eventDateColumnBody = (rowData: AttendanceLog) => {
    const event_time = dayjs(rowData.event_time).isValid() ? dayjs(rowData.event_time).format("DD-MM-YYYY HH:mm") : '';
    return <>{event_time}</>
  }


  return (
    <>
      <ConfirmDialog />
      <Card title={<CardTitle title='Attendance Log' url='' />}>
        <div className="p-3 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button label="Get Data" icon="pi pi-refresh" size="small" onClick={() => { onClickGetData() }} />
            </div>

            <IconField iconPosition="left">
              <InputIcon className="pi pi-search" />
              <InputText className="p-inputtext-sm" value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Keyword Search" />
            </IconField>
          </div>

          <DataTable
            value={AttendanceLogData}
            tableStyle={{ minWidth: "50rem" }}
            stripedRows
            paginator
            scrollable
            scrollHeight="500px"
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            dataKey="id"
            globalFilterFields={['name']}
            emptyMessage="No AttendanceLog found."
            header={<></>}
            filters={filters}
            currentPageReportTemplate="{first} to {last} of {totalRecords}"
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            loading={isLoading}
          >
            <Column header="#" headerStyle={{ width: '3rem' }} body={(data, options) => options.rowIndex + 1}></Column>
            <Column field="employee_name" header="Employee"></Column>
            <Column header="Event Time" body={(rowData) => eventDateColumnBody(rowData)}></Column>
            <Column header="Source" body={(rowData) => sourceColumnBody(rowData)}></Column>
            {/* <Column field="device_id" header="Device"></Column> */}
            <Column header="Photo" body={(rowData) => photoColumnBody(rowData)}></Column>
            <Column header="Location" body={(rowData) => coordsColumnBody(rowData)}></Column>
            {/* <Column field="is_active" header="Active" body={activeColumnBody}></Column> */}
            {/* <Column headerClassName='bg-white' className='bg-white' header="Action" body={(rowData) => actionColumnBody(rowData)} frozen={true} alignFrozen="right"></Column> */}
          </DataTable>
        </div>
      </Card>
    </>
  )
}

export default AttendanceLogTableData