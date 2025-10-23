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
import { Calendar } from 'primereact/calendar';
import { Nullable } from 'primereact/ts-helpers';
import { Controller, useForm } from 'react-hook-form';

interface FilterDate {
  startDate: Date | null,
  endDate: Date | null,
}

const AttendanceSummaryTableData = () => {
  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const [filters, setFilters] = useState({
    global: { value: '', matchMode: FilterMatchMode.CONTAINS },
  });
  const { control, watch } = useForm<FilterDate>();

  const [isProcessAttLogData, setIsProcessAttLogData] = useState(false);

  // SWR key dinamis berdasarkan tanggal & flag
  const startDate = watch('startDate') ? `&start_date=${dayjs(watch('startDate')).format('YYYY-MM-DD')}` : ''
  const endDate = watch('endDate') ? `&end_date=${dayjs(watch('endDate')).format('YYYY-MM-DD')}` : ''
  const filterDate = startDate && endDate ? `${startDate}${endDate}&` : ''
  const swrKey = `/api/attendance-summary?${filterDate}is_process_att_log=${isProcessAttLogData}`;

  const { data: AttendanceSummaryData, error, isLoading } = useSWR<AttendanceSummary[]>(swrKey, fetcher);

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const _filters = { ...filters };

    _filters['global'].value = value;

    setFilters(_filters);
    setGlobalFilterValue(value);
  };

  const onClickGetData = () => {
    setIsProcessAttLogData(true);
  };

  const onClickFilterData = () => {
    setIsProcessAttLogData(false);
  };

  const onClickExportData = async () => {
    try {
      const response = await fetch(`/api/attendance-summary/export/excel?${startDate}&${endDate}`, {
        method: "GET",
        headers: {
          "Accept": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Ambil nama file dari header "Content-Disposition"
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "report.xlsx";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      // Ubah response menjadi Blob (binary)
      const blob = await response.blob();

      // Buat URL sementara untuk blob
      const url = window.URL.createObjectURL(blob);

      // Buat elemen <a> untuk download
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      // Bersihkan
      a.remove();
      window.URL.revokeObjectURL(url);

      console.log("✅ File berhasil diunduh:", filename);
    } catch (error) {
      console.error("❌ Gagal download:", error);
    }
  };

  const checkInColumnBody = (rowData: AttendanceSummary) => {
    const check_in_time = dayjs(rowData.check_in_time).isValid()
      ? dayjs(rowData.check_in_time).format('DD-MM-YYYY HH:mm')
      : '';
    return <>{check_in_time}</>;
  };

  const checkOutColumnBody = (rowData: AttendanceSummary) => {
    const check_out_time = dayjs(rowData.check_out_time).isValid()
      ? dayjs(rowData.check_out_time).format('DD-MM-YYYY HH:mm')
      : '';
    return <>{check_out_time}</>;
  };

  const breakColumnBody = (rowData: AttendanceSummary) => {
    const workSeconds = rowData.is_break_second ?? 0;
    const hours = Math.floor(workSeconds / 3600);
    const minutes = Math.floor((workSeconds % 3600) / 60);
    return <>{rowData.is_break ? `Yes (${hours}j ${minutes}m)` : 'No'}</>;
  };

  const whColumnBody = (rowData: AttendanceSummary) => {
    const workHours = rowData.work_hours ?? 0;
    const hours = Math.floor(workHours / 3600);
    const minutes = Math.floor((workHours % 3600) / 60);
    return `${hours}j ${minutes}m`;
  };

  const lateColumnBody = (rowData: AttendanceSummary) => {
    return rowData.is_late ? 'Yes' : 'No';
  };

  const earlyCoColumnBody = (rowData: AttendanceSummary) => {
    return rowData.is_early_co ? 'Yes' : 'No';
  };

  if (isLoading) return <LoadingDataTable />;
  if (error) return <ErrorNotConnectedToApi mutateKey={swrKey} />;

  return (
    <>
      <ConfirmDialog />
      <Card title={<CardTitle title='Attendance Summary' url='' />}>
        <div className="p-3 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button
                loading={isLoading}
                loadingIcon="pi pi-loading"
                label="Process Attendance Log Data"
                icon="pi pi-refresh"
                size="small"
                onClick={onClickGetData}
              />
            </div>

            <div className="flex items-center justify-between gap-5">
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
          </div>

          {/* Date Filter Row */}
          <div className="flex items-end gap-5">
            {/* Start Date */}
            <div className="flex flex-col">
              <label>Start Date</label>
              <Controller
                name="startDate"
                control={control}
                rules={{
                  required: "*required",
                }}
                render={({ field, fieldState }) => (
                  <>
                    <Calendar
                      dateFormat='dd-mm-yy'
                      appendTo={() => document.body}
                      {...field}
                      id="start_date"
                      value={field.value}
                      onChange={(e) => {
                        field.onChange(e.value);
                      }}
                      hourFormat="24"
                      className={fieldState.invalid ? "w-full p-invalid" : "w-full"}
                    />
                    {fieldState.error && (
                      <small className="font-bold p-error"> {fieldState.error.message} </small>
                    )}
                  </>
                )}
              />
            </div>

            {/* End Date */}
            <div className="flex flex-col">
              <label>Start End</label>
              <Controller
                name="endDate"
                control={control}
                rules={{
                  required: "*required",
                }}
                render={({ field, fieldState }) => (
                  <>
                    <Calendar
                      dateFormat='dd-mm-yy'
                      appendTo={() => document.body}
                      {...field}
                      id="endDate"
                      value={field.value}
                      onChange={(e) => {
                        field.onChange(e.value);
                      }}
                      hourFormat="24"
                      className={fieldState.invalid ? "w-full p-invalid" : "w-full"}
                    />
                    {fieldState.error && (
                      <small className="font-bold p-error"> {fieldState.error.message} </small>
                    )}
                  </>
                )}
              />
            </div>

            {/* Filter Button */}
            <div className="self-end">
              <Button
                loading={isLoading}
                loadingIcon="pi pi-loading"
                label="Filter"
                icon="pi pi-filter"
                size="small"
                onClick={onClickFilterData}
              />
            </div>

            <div className="self-end">
              <Button
                disabled={AttendanceSummaryData?.length === 0}
                loading={isLoading}
                loadingIcon="pi pi-loading"
                label="Export To Excel"
                icon="pi pi-file-excel"
                size="small"
                severity='warning'
                onClick={onClickExportData}
              />
            </div>
          </div>

          <DataTable
            value={AttendanceSummaryData}
            tableStyle={{ minWidth: '50rem' }}
            stripedRows
            paginator
            scrollable
            scrollHeight="500px"
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            dataKey="id"
            globalFilterFields={['name']}
            emptyMessage="No Attendance Summary found."
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
            <Column header="Break" body={breakColumnBody}></Column>
            <Column header="Work Hours" body={whColumnBody}></Column>
            <Column field="status" header="Status"></Column>
            <Column header="Late" body={lateColumnBody}></Column>
            <Column header="Early Check out" body={earlyCoColumnBody}></Column>
            <Column field="overtime" header="Overtime"></Column>
          </DataTable>
        </div>
      </Card>
    </>
  );
};

export default AttendanceSummaryTableData;
