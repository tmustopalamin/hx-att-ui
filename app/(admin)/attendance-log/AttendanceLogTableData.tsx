'use client'

import { Card } from 'primereact/card'
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { ConfirmDialog } from 'primereact/confirmdialog';
import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/app/utils/fetcher';
import { AttendanceLog } from '@/app/types/attendance-log';
import ErrorNotConnectedToApi from '@/app/_components/ErrorNotConnectedToApi';
import LoadingDataTable from '@/app/_components/LoadingDataTable';
import dayjs from 'dayjs';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { remapEmployeeAttendanceLog } from '@/app/services/attendance-log-service';
import { isResponseTypeError, getErrorMessage } from '@/app/utils/error-messages';
import { useDispatch } from 'react-redux';
import { showToast } from '@/store/ToastSlice';
import { Dialog } from 'primereact/dialog';

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const AttendanceLogTableData = () => {

  const dispatch = useDispatch();
  const [isFetchData, setIsFetchData] = useState(false);

  // FILTER STATE
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [sourceType, setSourceType] = useState<string | null>(null);
  const [employeeName, setEmployeeName] = useState('');

  // PHOTO POPUP
  const [photoDialog, setPhotoDialog] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const openPhoto = (url: string) => {
    setSelectedPhoto(url);
    setPhotoDialog(true);
  };

  const hidePhoto = () => {
    setPhotoDialog(false);
    setSelectedPhoto(null);
  };

  const { data: AttendanceLogData, error, isLoading, mutate } = useSWR<AttendanceLog[]>(`/api/attendance-log?is_fetch_data=${isFetchData}`, fetcher, {
    revalidateOnFocus: false,
  });

  if (isLoading) return <LoadingDataTable />;
  if (error) return <ErrorNotConnectedToApi mutateKey='/api/attendance-log' />

  const onClickGetData = () => {
    setIsFetchData(true)
    mutate();
  };

  const onClickRemapEmployee = async () => {
    try {
      await remapEmployeeAttendanceLog();
      mutate();
      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: 'Mapping PIN to Employee Success ' }));
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  };

  // FILTER LOGIC
  const filteredData = AttendanceLogData?.filter((item) => {
    if (!item.event_time) return true;

    const eventDate = new Date(item.event_time);

    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (eventDate < from) return false;
    }

    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (eventDate > to) return false;
    }

    if (sourceType && item.source_type !== sourceType) return false;

    if (employeeName && !item.employee_name.toLowerCase().includes(employeeName.toLowerCase())) return false;

    return true;
  });

  // EXPORT EXCEL
  const exportExcel = () => {
    if (!filteredData) return;

    const exportData = filteredData.map((item, index) => ({
      No: index + 1,
      Employee: item.employee_name,
      EventTime: dayjs(item.event_time).format("DD-MM-YYYY HH:mm"),
      Source: item.source_type,
      Machine: item.machine_name,
      Latitude: item.latitude,
      Longitude: item.longitude
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Log");

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const data = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });

    saveAs(data, "attendance_log.xlsx");
  };

  const sourceOptions = [
    { label: 'GPS+PHOTO', value: 'GPS+PHOTO' },
    { label: 'MACHINE', value: 'MACHINE' }
  ];

  const eventDateColumnBody = (rowData: AttendanceLog) => {
    return dayjs(rowData.event_time).format("DD-MM-YYYY HH:mm:ss");
  };

  return (
    <>
      <ConfirmDialog />

      <Card>
        <div className="p-4 flex flex-col gap-4">

          {/* HEADER */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b pb-3">
            <div>
              <div className="text-2xl font-semibold">Attendance Log</div>
              <div className="text-sm text-gray-500">
                Manage and monitor employee attendance records
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button label="Sync Log" icon="pi pi-refresh" size="small" onClick={() => onClickGetData()} />
              <Button label="Remap Employee" icon="pi pi-refresh" size="small" className="p-button-warning" onClick={() => onClickRemapEmployee()} />
              <Button label="Export Excel" icon="pi pi-file-excel" size="small" className="p-button-success" onClick={exportExcel} />
            </div>
          </div>

          {/* FILTER TOOLBAR */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-gray-50 p-3 rounded-lg border">
            <InputText
              placeholder="Employee"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
            />

            <Calendar
              value={dateFrom}
              onChange={(e) => setDateFrom(e.value as Date)}
              placeholder="Date From"
              dateFormat="dd-mm-yy"
              showIcon
              appendTo={document.body}
            />

            <Calendar
              value={dateTo}
              onChange={(e) => setDateTo(e.value as Date)}
              placeholder="Date To"
              dateFormat="dd-mm-yy"
              showIcon
              appendTo={document.body}
            />

            <Dropdown
              value={sourceType}
              options={sourceOptions}
              onChange={(e) => setSourceType(e.value)}
              placeholder="Source"
              className="w-full"
            />

            <Button
              label="Reset"
              icon="pi pi-filter-slash"
              className="p-button-secondary"
              onClick={() => {
                setDateFrom(null);
                setDateTo(null);
                setSourceType(null);
                setEmployeeName('');
              }}
            />
          </div>

          {/* TABLE */}
          <DataTable
            value={filteredData}
            stripedRows
            paginator
            scrollable
            scrollHeight="500px"
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            dataKey="id"
            emptyMessage="No AttendanceLog found."
          >
            <Column header="#" headerStyle={{ width: '3rem' }} body={(data, options) => options.rowIndex + 1}></Column>
            <Column field="employee_name" header="Employee"></Column>
            <Column field="event_time" header="Event Time" body={(rowData) => eventDateColumnBody(rowData)}></Column>
            <Column field='source_type' header="Verification Source"></Column>
            <Column field="machine_name" header="Machine"></Column>
            <Column field="latitude" header="Lat"></Column>
            <Column field="longitude" header="Lon"></Column>
          </DataTable>

        </div>
      </Card>

      {/* PHOTO POPUP */}
      <Dialog
        header="Photo"
        visible={photoDialog}
        style={{ width: '400px' }}
        onHide={hidePhoto}
      >
        {selectedPhoto && (
          <img src={selectedPhoto} alt="Attendance" className="w-full" />
        )}
      </Dialog>
    </>
  )
}

export default AttendanceLogTableData;