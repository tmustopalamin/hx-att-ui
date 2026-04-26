'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

import { Card } from 'primereact/card'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { InputText } from 'primereact/inputtext'
import { Button } from 'primereact/button'
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog'
import { Calendar } from 'primereact/calendar'
import { Dropdown } from 'primereact/dropdown'
import { Dialog } from 'primereact/dialog'
import { Tag } from 'primereact/tag'
import { Divider } from 'primereact/divider'
import { Tooltip } from 'primereact/tooltip'

import { fetcher } from '@/app/utils/fetcher'
import { AttendanceLog } from '@/app/types/attendance-log'
import ErrorNotConnectedToApi from '@/app/_components/ErrorNotConnectedToApi'
import LoadingDataTable from '@/app/_components/LoadingDataTable'
import { remapEmployeeAttendanceLog } from '@/app/services/attendance-log-service'
import { isResponseTypeError, getErrorMessage } from '@/app/utils/error-messages'
import { useDispatch } from 'react-redux'
import { showToast } from '@/store/ToastSlice'

type ProcessedFilter = 'ALL' | 'PROCESSED' | 'UNPROCESSED'

const AttendanceLogTableData = () => {
  const dispatch = useDispatch()

  const [isFetchData, setIsFetchData] = useState(false)
  const [requestVersion, setRequestVersion] = useState(0)

  const [dateFrom, setDateFrom] = useState<Date | null>(null)
  const [dateTo, setDateTo] = useState<Date | null>(null)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [processedFilter, setProcessedFilter] = useState<ProcessedFilter>('ALL')

  const [detailDialog, setDetailDialog] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AttendanceLog | null>(null)

  const swrKey = `/api/attendance-log?is_fetch_data=${isFetchData}&v=${requestVersion}`

  const {
    data: attendanceLogData,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<AttendanceLog[]>(swrKey, fetcher, {
    revalidateOnFocus: false,
  })

  const rows = attendanceLogData ?? []

  const statusOptions = useMemo(() => {
    const values = [...new Set(rows.map((item) => item.status).filter(Boolean))]
    return values.map((value) => ({
      label: value,
      value,
    }))
  }, [rows])

  const summaryStats = useMemo(() => {
    return {
      total: rows.length,
      processed: rows.filter((item) => item.processed).length,
      invalid: rows.filter((item) => item.status === 'INVALID').length,
      employees: new Set(rows.map((item) => item.employee_id).filter((v) => v !== null)).size,
    }
  }, [rows])

  const filteredData = useMemo(() => {
    return rows.filter((item) => {
      const displayDate = item.event_time_source_local
        ? dayjs(item.event_time_source_local)
        : item.event_time
          ? dayjs(item.event_time)
          : null

      const search = keyword.toLowerCase().trim()

      const employeeDisplay = item.employee_name ?? (item.employee_id ? `Employee #${item.employee_id}` : 'Unmapped')
      const machineDisplay = item.machine_name ?? '-'

      const matchKeyword =
        !search ||
        employeeDisplay.toLowerCase().includes(search) ||
        machineDisplay.toLowerCase().includes(search) ||
        (item.machine_pin ?? '').toLowerCase().includes(search) ||
        (item.status ?? '').toLowerCase().includes(search) ||
        (item.source_type ?? '').toLowerCase().includes(search)

      const matchDateFrom =
        !dateFrom ||
        (displayDate !== null &&
          displayDate.startOf('day').valueOf() >= dayjs(dateFrom).startOf('day').valueOf())

      const matchDateTo =
        !dateTo ||
        (displayDate !== null &&
          displayDate.endOf('day').valueOf() <= dayjs(dateTo).endOf('day').valueOf())

      const matchStatus = !statusFilter || item.status === statusFilter

      const matchProcessed =
        processedFilter === 'ALL' ||
        (processedFilter === 'PROCESSED' && item.processed) ||
        (processedFilter === 'UNPROCESSED' && !item.processed)

      return matchKeyword && matchDateFrom && matchDateTo && matchStatus && matchProcessed
    })
  }, [rows, keyword, dateFrom, dateTo, statusFilter, processedFilter])

  const onClickSyncLog = () => {
    confirmDialog({
      header: 'Sync Attendance Log',
      message: 'Pull latest attendance logs from fingerprint scanner?',
      icon: 'pi pi-info-circle',
      defaultFocus: 'accept',
      accept: async () => {
        setIsFetchData(true)
        setRequestVersion((prev) => prev + 1)
        await mutate()

        dispatch(
          showToast({
            visible: true,
            severity: 'success',
            summary: 'Success',
            detail: 'Attendance log sync triggered',
          })
        )
      },
      reject: () => { },
    })
  }

  const onClickRemapEmployee = async () => {
    confirmDialog({
      header: 'Remap Employee',
      message: 'Remap machine PIN to employee?',
      icon: 'pi pi-info-circle',
      defaultFocus: 'accept',
      accept: async () => {
        try {
          await remapEmployeeAttendanceLog()
          await mutate()

          dispatch(
            showToast({
              visible: true,
              severity: 'success',
              summary: 'Success',
              detail: 'PIN mapping updated successfully',
            })
          )
        } catch (err: unknown) {
          if (isResponseTypeError(err)) {
            dispatch(
              showToast({
                visible: true,
                severity: 'error',
                summary: 'Error',
                detail: getErrorMessage(err, 'message'),
              })
            )
          } else if (err instanceof Error) {
            dispatch(
              showToast({
                visible: true,
                severity: 'error',
                summary: 'Error',
                detail: err.message,
              })
            )
          }
        }
      },
      reject: () => { },
    })
  }

  const formatDisplayTime = (item: AttendanceLog) => {
    const displayDate = item.event_time_source_local
      ? dayjs(item.event_time_source_local)
      : item.event_time
        ? dayjs(item.event_time)
        : null

    return displayDate ? displayDate.format('DD-MM-YYYY HH:mm:ss') : '-'
  }

  const formatUtcTime = (value: string | null) => {
    return value ? dayjs(value).format('DD-MM-YYYY HH:mm:ss') : '-'
  }

  const getEmployeeName = (item: AttendanceLog) => {
    return item.employee_name ?? (item.employee_id ? `Employee #${item.employee_id}` : 'Unmapped')
  }

  const getMachineName = (item: AttendanceLog) => {
    return item.machine_name ?? '-'
  }

  const autoFitColumns = (
    worksheet: XLSX.WorkSheet,
    rowsForWidth: Record<string, unknown>[]
  ) => {
    if (!rowsForWidth.length) return

    const keys = Object.keys(rowsForWidth[0])
    const colWidths = keys.map((key) => {
      const maxContentLength = Math.max(
        key.length,
        ...rowsForWidth.map((row) => String(row[key] ?? '').length)
      )

      return { wch: Math.min(Math.max(maxContentLength + 2, 12), 40) }
    })

    worksheet['!cols'] = colWidths
  }

  const exportExcel = () => {
    if (!filteredData.length) {
      dispatch(
        showToast({
          visible: true,
          severity: 'warn',
          summary: 'Warning',
          detail: 'No data available to export',
        })
      )
      return
    }

    const exportedAt = dayjs().format('DD MMM YYYY HH:mm:ss')

    const filteredProcessedCount = filteredData.filter((item) => item.processed).length
    const filteredInvalidCount = filteredData.filter((item) => item.status === 'INVALID').length
    const filteredEmployeesCount = new Set(
      filteredData.map((item) => item.employee_id).filter((v) => v !== null)
    ).size

    const summarySheetRows = [
      { Field: 'Report Name', Value: 'Attendance Log Export' },
      { Field: 'Exported At', Value: exportedAt },
      { Field: 'Total Exported Rows', Value: filteredData.length },
      { Field: 'Processed Rows', Value: filteredProcessedCount },
      { Field: 'Invalid Rows', Value: filteredInvalidCount },
      { Field: 'Unique Employees', Value: filteredEmployeesCount },
      { Field: 'Keyword Filter', Value: keyword || 'All' },
      {
        Field: 'Date Range',
        Value:
          dateFrom || dateTo
            ? `${dateFrom ? dayjs(dateFrom).format('DD-MM-YYYY') : '...'} to ${dateTo ? dayjs(dateTo).format('DD-MM-YYYY') : '...'}`
            : 'All',
      },
      { Field: 'Status Filter', Value: statusFilter || 'All' },
      { Field: 'Processed Filter', Value: processedFilter },
    ]

    const detailSheetRows = filteredData.map((item, index) => ({
      No: index + 1,
      Employee: getEmployeeName(item),
      EmployeeId: item.employee_id ?? '',
      Machine: getMachineName(item),
      MachineId: item.machine_id ?? '',
      PIN: item.machine_pin ?? '',
      EventTimeDisplayed: formatDisplayTime(item),
      EventTimeUTC: formatUtcTime(item.event_time),
      SourceType: item.source_type ?? '',
      Status: item.status ?? '',
      Processed: item.processed ? 'Yes' : 'No',
      ProcessedAt: formatUtcTime(item.processed_at),
      ExternalSystem: item.external_system ?? '',
      ExternalRefId: item.external_ref_id ?? '',
      Latitude: item.latitude ?? '',
      Longitude: item.longitude ?? '',
      FaceId: item.face_id ?? '',
      ExtraData: item.extra_data ? JSON.stringify(item.extra_data) : '',
    }))

    const workbook = XLSX.utils.book_new()

    const summarySheet = XLSX.utils.json_to_sheet(summarySheetRows)
    autoFitColumns(summarySheet, summarySheetRows)
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

    const detailSheet = XLSX.utils.json_to_sheet(detailSheetRows)
    autoFitColumns(detailSheet, detailSheetRows)
    XLSX.utils.book_append_sheet(workbook, detailSheet, 'Attendance Log')

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    })

    const fileData = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    const fileName = `attendance_log_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`
    saveAs(fileData, fileName)

    dispatch(
      showToast({
        visible: true,
        severity: 'success',
        summary: 'Success',
        detail: 'Attendance log exported successfully',
      })
    )
  }

  const resetFilters = () => {
    setDateFrom(null)
    setDateTo(null)
    setKeyword('')
    setStatusFilter(null)
    setProcessedFilter('ALL')
  }

  const openDetail = (row: AttendanceLog) => {
    setSelectedLog(row)
    setDetailDialog(true)
  }

  const renderStatusTag = (status: string) => {
    const normalized = status?.toUpperCase()

    if (normalized === 'VALID') return <Tag value="Valid" severity="success" />
    if (normalized === 'INVALID') return <Tag value="Invalid" severity="danger" />
    if (normalized === 'DUPLICATE') return <Tag value="Duplicate" severity="warning" />
    if (normalized === 'IGNORED') return <Tag value="Ignored" severity="secondary" />

    return <Tag value={status || '-'} severity="info" />
  }

  const renderProcessedTag = (processed: boolean) => {
    return processed
      ? <Tag value="Processed" severity="success" />
      : <Tag value="Unprocessed" severity="warning" />
  }

  const displayTimeBody = (rowData: AttendanceLog) => {
    return formatDisplayTime(rowData)
  }

  const employeeBody = (rowData: AttendanceLog) => {
    return getEmployeeName(rowData)
  }

  const machineBody = (rowData: AttendanceLog) => {
    return getMachineName(rowData)
  }

  const actionBody = (rowData: AttendanceLog) => {
    return (
      <Button
        icon="pi pi-eye"
        rounded
        text
        size="small"
        tooltip="Detail"
        onClick={() => openDetail(rowData)}
      />
    )
  }

  if (isLoading && !attendanceLogData) return <LoadingDataTable />
  if (error) return <ErrorNotConnectedToApi mutateKey={swrKey} />

  return (
    <>
      <ConfirmDialog />
      <Tooltip target=".summary-info-icon" />

      <Card>
        <div className="p-4 flex flex-col gap-4">

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 border-b pb-3">
            <div>
              <div className="text-2xl font-semibold">Attendance Log</div>
              <div className="text-sm text-gray-500">
                Review raw attendance events before processing summary
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                label="Sync Log"
                icon="pi pi-refresh"
                size="small"
                loading={isValidating && isFetchData}
                onClick={onClickSyncLog}
              />
              <Button
                label="Remap Employee"
                icon="pi pi-user-edit"
                size="small"
                className="p-button-warning"
                onClick={onClickRemapEmployee}
              />
              <Button
                label="Export Excel"
                icon="pi pi-file-excel"
                size="small"
                className="p-button-success"
                onClick={exportExcel}
                disabled={!filteredData.length}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="text-xs text-gray-500">Total Logs</div>
              <div className="text-xl font-semibold text-gray-900">{summaryStats.total}</div>
            </div>

            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-green-700">
                <span>Processed</span>
                <i
                  className="pi pi-info-circle summary-info-icon text-xs cursor-pointer"
                  data-pr-tooltip="Processed means this log has already been used in attendance summary processing."
                  data-pr-position="top"
                />
              </div>
              <div className="text-xl font-semibold text-green-800">{summaryStats.processed}</div>
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-red-700">
                <span>Invalid</span>
                <i
                  className="pi pi-info-circle summary-info-icon text-xs cursor-pointer"
                  data-pr-tooltip="Invalid means the log could not be matched properly, usually because employee mapping or raw source data is incomplete."
                  data-pr-position="top"
                />
              </div>
              <div className="text-xl font-semibold text-red-800">{summaryStats.invalid}</div>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
              <div className="text-xs text-blue-700">Employees</div>
              <div className="text-xl font-semibold text-blue-800">{summaryStats.employees}</div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <InputText
                placeholder="Search employee, machine, PIN, source, status"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="md:col-span-2"
              />

              <Calendar
                value={dateFrom}
                onChange={(e) => setDateFrom(e.value as Date)}
                placeholder="Date From"
                dateFormat="dd-mm-yy"
                showIcon
                appendTo={() => document.body}
              />

              <Calendar
                value={dateTo}
                onChange={(e) => setDateTo(e.value as Date)}
                placeholder="Date To"
                dateFormat="dd-mm-yy"
                showIcon
                appendTo={() => document.body}
              />

              <Dropdown
                value={statusFilter}
                options={statusOptions}
                onChange={(e) => setStatusFilter(e.value)}
                placeholder="Status"
                className="w-full"
                showClear
                appendTo={() => document.body}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 items-center">
              <Dropdown
                value={processedFilter}
                options={[
                  { label: 'All Processing Status', value: 'ALL' },
                  { label: 'Processed', value: 'PROCESSED' },
                  { label: 'Unprocessed', value: 'UNPROCESSED' },
                ]}
                onChange={(e) => setProcessedFilter(e.value)}
                className="w-full"
                appendTo={() => document.body}
              />

              <div className="md:col-span-2 flex justify-end">
                <Button
                  label="Reset Filter"
                  icon="pi pi-filter-slash"
                  className="p-button-secondary"
                  onClick={resetFilters}
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Legend
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-3">
                {renderStatusTag('VALID')}
                <div className="text-sm text-gray-600">
                  Valid log and ready to be used in attendance summary processing.
                </div>
              </div>

              <div className="flex items-start gap-3">
                {renderStatusTag('INVALID')}
                <div className="text-sm text-gray-600">
                  Invalid log, usually because the employee is not mapped yet or the source data is incomplete.
                </div>
              </div>

              <div className="flex items-start gap-3">
                {renderStatusTag('DUPLICATE')}
                <div className="text-sm text-gray-600">
                  Duplicate log detected from the machine or from the same imported record.
                </div>
              </div>

              <div className="flex items-start gap-3">
                {renderProcessedTag(true)}
                <div className="text-sm text-gray-600">
                  This log has already been used to build attendance summary data.
                </div>
              </div>

              <div className="flex items-start gap-3">
                {renderProcessedTag(false)}
                <div className="text-sm text-gray-600">
                  This log has not been processed into attendance summary yet.
                </div>
              </div>
            </div>
          </div>

          <Divider className="my-0" />

          <DataTable
            value={filteredData}
            stripedRows
            paginator
            scrollable
            scrollHeight="550px"
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            dataKey="id"
            emptyMessage="No attendance log found"
          >
            <Column header="#" headerStyle={{ width: '3rem' }} body={(_, options) => options.rowIndex + 1} />
            <Column header="Employee" body={employeeBody} />
            <Column header="Machine" body={machineBody} />
            <Column field="machine_pin" header="PIN" />
            <Column header="Event Time" body={displayTimeBody} />
            <Column field="source_type" header="Source" />
            <Column header="Status" body={(rowData) => renderStatusTag(rowData.status)} />
            <Column header="Processed" body={(rowData) => renderProcessedTag(rowData.processed)} />
            <Column header="Action" body={actionBody} frozen alignFrozen="right" />
          </DataTable>

        </div>
      </Card>

      <Dialog
        header="Attendance Log Detail"
        visible={detailDialog}
        style={{ width: '700px', maxWidth: '95vw' }}
        onHide={() => {
          setDetailDialog(false)
          setSelectedLog(null)
        }}
      >
        {selectedLog && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-500">Employee</div>
                <div className="font-medium">
                  {selectedLog.employee_name ?? (selectedLog.employee_id ? `Employee #${selectedLog.employee_id}` : 'Unmapped')}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500">Machine</div>
                <div className="font-medium">{selectedLog.machine_name ?? '-'}</div>
              </div>

              <div>
                <div className="text-xs text-gray-500">PIN</div>
                <div className="font-medium">{selectedLog.machine_pin ?? '-'}</div>
              </div>

              <div>
                <div className="text-xs text-gray-500">Source Type</div>
                <div className="font-medium">{selectedLog.source_type ?? '-'}</div>
              </div>

              <div>
                <div className="text-xs text-gray-500">Source Local Time</div>
                <div className="font-medium">
                  {selectedLog.event_time_source_local
                    ? dayjs(selectedLog.event_time_source_local).format('DD-MM-YYYY HH:mm:ss')
                    : '-'}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500">UTC Time</div>
                <div className="font-medium">
                  {selectedLog.event_time
                    ? dayjs(selectedLog.event_time).format('DD-MM-YYYY HH:mm:ss')
                    : '-'}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500">Status</div>
                <div>{renderStatusTag(selectedLog.status)}</div>
              </div>

              <div>
                <div className="text-xs text-gray-500">Processed</div>
                <div>{renderProcessedTag(selectedLog.processed)}</div>
              </div>
            </div>

            {selectedLog.photo_url && (
              <div>
                <div className="text-xs text-gray-500 mb-2">Photo</div>
                <img
                  src={`http://localhost:3050/api/public/upload/attendance/${selectedLog.photo_url}`}
                  alt="Attendance"
                  className="w-full max-w-sm rounded-lg border"
                />
              </div>
            )}

            <div>
              <div className="text-xs text-gray-500 mb-2">Extra Data</div>
              <pre className="bg-gray-50 border rounded-lg p-3 text-xs overflow-auto whitespace-pre-wrap">
                {JSON.stringify(selectedLog.extra_data ?? {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Dialog>
    </>
  )
}

export default AttendanceLogTableData