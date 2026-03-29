'use client'

import { Card } from 'primereact/card'
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Button } from 'primereact/button';
import { ConfirmDialog } from 'primereact/confirmdialog';
import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/app/utils/fetcher';
import ErrorNotConnectedToApi from '@/app/_components/ErrorNotConnectedToApi';
import LoadingDataTable from '@/app/_components/LoadingDataTable';
import dayjs from 'dayjs';
import { AttendanceSummary } from '@/app/types/attendance-summary';
import { Calendar } from 'primereact/calendar';
import { Controller, useForm } from 'react-hook-form';

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface FilterDate {
  startDate: Date | null,
  endDate: Date | null,
}

const AttendanceSummaryTableData = () => {

  const { control, watch } = useForm<FilterDate>();
  const [isProcessAttLogData, setIsProcessAttLogData] = useState(false);

  const startDate = watch('startDate') ? `&start_date=${dayjs(watch('startDate')).format('YYYY-MM-DD')}` : ''
  const endDate = watch('endDate') ? `&end_date=${dayjs(watch('endDate')).format('YYYY-MM-DD')}` : ''
  const filterDate = startDate && endDate ? `${startDate}${endDate}&` : ''
  const swrKey = `/api/attendance-summary?${filterDate}is_process_att_log=${isProcessAttLogData}`;

  const { data: AttendanceSummaryData, error, isLoading } = useSWR<AttendanceSummary[]>(swrKey, fetcher);

  const onClickGetData = () => {
    setIsProcessAttLogData(true);
  };

  const onClickFilterData = () => {
    setIsProcessAttLogData(false);
  };

  // EXPORT EXCEL FROM DATATABLE UI
  const exportExcel = () => {
    if (!AttendanceSummaryData) return;

    const exportData = AttendanceSummaryData.map((item: AttendanceSummary, index) => {
      const workHours = item.work_hours ?? 0;
      const hours = Math.floor(workHours / 3600);
      const minutes = Math.floor((workHours % 3600) / 60);

      return {
        No: index + 1,
        Employee: item.full_name,
        Date: dayjs(item.summary_date).format('DD-MM-YYYY'),
        Shift: item.shift_name,
        CheckIn: dayjs(item.check_in_time).isValid()
          ? dayjs(item.check_in_time).format('DD-MM-YYYY HH:mm')
          : '',
        CheckOut: dayjs(item.check_out_time).isValid()
          ? dayjs(item.check_out_time).format('DD-MM-YYYY HH:mm')
          : '',
        WorkHours: `${hours}h ${minutes}m`,
        Status: item.status,
        Overtime: item.overtime_hours
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Summary");

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const data = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });

    saveAs(data, "attendance_summary.xlsx");
  };

  // FORMAT DATE COLUMNS
  const dateColumnBody = (rowData: AttendanceSummary) => {
    return dayjs(rowData.summary_date).format('DD-MM-YYYY');
  };

  const checkInColumnBody = (rowData: AttendanceSummary) => {
    return dayjs(rowData.check_in_time).isValid()
      ? dayjs(rowData.check_in_time).format('DD-MM-YYYY HH:mm')
      : '';
  };

  const checkOutColumnBody = (rowData: AttendanceSummary) => {
    return dayjs(rowData.check_out_time).isValid()
      ? dayjs(rowData.check_out_time).format('DD-MM-YYYY HH:mm')
      : '';
  };

  const whColumnBody = (rowData: AttendanceSummary) => {
    const workHours = rowData.work_hours ?? 0;
    const hours = Math.floor(workHours / 3600);
    const minutes = Math.floor((workHours % 3600) / 60);
    return `${hours}j ${minutes}m`;
  };

  if (isLoading) return <LoadingDataTable />;
  if (error) return <ErrorNotConnectedToApi mutateKey={swrKey} />;

  return (
    <>
      <ConfirmDialog />

      <Card>
        <div className="p-4 flex flex-col gap-4">

          {/* HEADER */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b pb-3">
            <div>
              <div className="text-2xl font-semibold">Attendance Summary</div>
              <div className="text-sm text-gray-500">
                View employee attendance summary and work hours
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                loading={isLoading}
                label="Process Attendance"
                icon="pi pi-refresh"
                size="small"
                onClick={onClickGetData}
              />
              <Button
                label="Export Excel"
                icon="pi pi-file-excel"
                size="small"
                className="p-button-success"
                onClick={exportExcel}
              />
            </div>
          </div>

          {/* FILTER */}
          <div className="flex flex-wrap items-end gap-3 bg-gray-50 p-3 rounded-lg border">

            <div className="flex flex-col">
              <label>Start Date</label>
              <Controller
                name="startDate"
                control={control}
                render={({ field }) => (
                  <Calendar
                    dateFormat='dd-mm-yy'
                    appendTo={() => document.body}
                    value={field.value}
                    onChange={(e) => field.onChange(e.value)}
                  />
                )}
              />
            </div>

            <div className="flex flex-col">
              <label>End Date</label>
              <Controller
                name="endDate"
                control={control}
                render={({ field }) => (
                  <Calendar
                    dateFormat='dd-mm-yy'
                    appendTo={() => document.body}
                    value={field.value}
                    onChange={(e) => field.onChange(e.value)}
                  />
                )}
              />
            </div>

            <Button
              label="Filter"
              icon="pi pi-filter"
              size="small"
              onClick={onClickFilterData}
            />
          </div>

          {/* TABLE */}
          <DataTable
            value={AttendanceSummaryData}
            stripedRows
            paginator
            scrollable
            scrollHeight="500px"
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            dataKey="id"
          >
            <Column header="#" body={(data, options) => options.rowIndex + 1}></Column>
            <Column field="full_name" header="Employee"></Column>
            <Column header="Date" body={dateColumnBody}></Column>
            <Column field="shift_name" header="Shift"></Column>
            <Column header="Check In" body={checkInColumnBody}></Column>
            <Column header="Check Out" body={checkOutColumnBody}></Column>
            <Column header="Work Hours" body={whColumnBody}></Column>
            <Column field="status" header="Status"></Column>
            <Column field="overtime" header="Overtime"></Column>
          </DataTable>

        </div>
      </Card>
    </>
  );
};

export default AttendanceSummaryTableData;