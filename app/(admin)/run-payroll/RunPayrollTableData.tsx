'use client'

import { useState } from 'react'
import useSWR from 'swr'
import dayjs from 'dayjs'

import { Card } from 'primereact/card'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import { Tag } from 'primereact/tag'
import { InputText } from 'primereact/inputtext'
import { IconField } from 'primereact/iconfield'
import { InputIcon } from 'primereact/inputicon'
import { FilterMatchMode } from 'primereact/api'

import CardTitle from '@/app/_components/CardTitle'
import LoadingDataTable from '@/app/_components/LoadingDataTable'
import { fetcher } from '@/app/utils/fetcher'
import { AttendanceSummary } from '@/app/types/attendance-summary'

/* =======================
   TYPE
======================= */
type PayrollSimulation = {
  id: number
  period_start: string
  period_end: string
  cutoff_date: string
  status: 'draft' | 'locked' | 'approved'
  created_at: string
}

/* =======================
   COMPONENT
======================= */
export default function RunPayrollTableData() {
  /* ---------- HOOKS (JANGAN KONDISIONAL) ---------- */
  const [globalFilterValue, setGlobalFilterValue] = useState('')
  const [filters, setFilters] = useState({
    global: { value: '', matchMode: FilterMatchMode.CONTAINS },
  })

  const [showModal, setShowModal] = useState(false)
  const [selectedSimulation, setSelectedSimulation] =
    useState<PayrollSimulation | null>(null)

  const [simulations] = useState<PayrollSimulation[]>([
    {
      id: 1,
      period_start: '2024-01-01',
      period_end: '2024-01-31',
      cutoff_date: '2024-01-15',
      status: 'draft',
      created_at: '2024-01-02',
    },
    {
      id: 2,
      period_start: '2024-02-01',
      period_end: '2024-02-29',
      cutoff_date: '2024-02-15',
      status: 'draft',
      created_at: '2024-02-02',
    },
  ])

  const { data, isLoading } = useSWR<AttendanceSummary[]>(
    '/api/run-payroll',
    fetcher,
    { revalidateOnFocus: false }
  )

  /* ---------- HANDLER ---------- */
  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFilters({ global: { value, matchMode: FilterMatchMode.CONTAINS } })
    setGlobalFilterValue(value)
  }

  /* ---------- TEMPLATE ---------- */
  const checkInBody = (row: AttendanceSummary) =>
    row.check_in_time
      ? dayjs(row.check_in_time).format('DD-MM-YYYY HH:mm')
      : '-'

  const checkOutBody = (row: AttendanceSummary) =>
    row.check_out_time
      ? dayjs(row.check_out_time).format('DD-MM-YYYY HH:mm')
      : '-'

  const whBody = (row: AttendanceSummary) => {
    const sec = row.work_hours ?? 0
    return `${Math.floor(sec / 3600)}j ${Math.floor((sec % 3600) / 60)}m`
  }

  const statusTemplate = (row: PayrollSimulation) => (
    <Tag
      value={row.status.toUpperCase()}
      severity={
        row.status === 'draft'
          ? 'warning'
          : row.status === 'locked'
            ? 'info'
            : 'success'
      }
    />
  )

  const actionTemplate = (row: PayrollSimulation) => (
    <Button
      icon="pi pi-pencil"
      text
      rounded
      tooltip="Edit"
      onClick={() => {
        setSelectedSimulation(row)
        setShowModal(true)
      }}
    />
  )

  /* ---------- LOADING ---------- */
  if (isLoading) return <LoadingDataTable />

  /* =======================
     RENDER
  ======================= */
  return (
    <>
      {/* ================= MODAL ================= */}
      <Dialog
        header="Payroll Simulation Detail"
        visible={showModal}
        style={{ width: '420px' }}
        modal
        onHide={() => setShowModal(false)}
      >
        {selectedSimulation && (
          <div className="flex flex-col gap-3 text-sm">
            <div>
              <b>Period</b>
              <div>
                {selectedSimulation.period_start} →{' '}
                {selectedSimulation.period_end}
              </div>
            </div>

            <div>
              <b>Cutoff Date</b>
              <div>{selectedSimulation.cutoff_date}</div>
            </div>

            <div>
              <b>Status</b>
              <div>{statusTemplate(selectedSimulation)}</div>
            </div>

            <div>
              <b>Created At</b>
              <div>{selectedSimulation.created_at}</div>
            </div>
          </div>
        )}
      </Dialog>

      {/* ================= ATTENDANCE ================= */}
      {/* <Card title={<CardTitle title="Attendance Summary" url="" />}>
        <div className="flex justify-between mb-3">
          <IconField iconPosition="left">
            <InputIcon className="pi pi-search" />
            <InputText
              value={globalFilterValue}
              onChange={onGlobalFilterChange}
              placeholder="Search"
              className="p-inputtext-sm"
            />
          </IconField>
        </div>

        <DataTable
          value={data}
          paginator
          rows={10}
          stripedRows
          filters={filters}
          globalFilterFields={['full_name']}
        >
          <Column header="#" body={(_, opt) => opt.rowIndex + 1} />
          <Column field="full_name" header="Employee" />
          <Column field="summary_date" header="Date" />
          <Column header="Check In" body={checkInBody} />
          <Column header="Check Out" body={checkOutBody} />
          <Column header="Work Hours" body={whBody} />
        </DataTable>
      </Card> */}

      {/* ================= PAYROLL DRAFT ================= */}
      <Card
        title="Payroll Simulation Draft"
        subTitle="List payroll simulation draft"
        className="mt-4"
      >
        <DataTable value={simulations} paginator rows={10} stripedRows>
          <Column field="id" header="ID" />
          <Column
            header="Period"
            body={(row: PayrollSimulation) =>
              `${row.period_start} → ${row.period_end}`
            }
          />
          <Column field="cutoff_date" header="Cutoff" />
          <Column header="Status" body={statusTemplate} />
          <Column header="Action" body={actionTemplate} />
        </DataTable>
      </Card>
    </>
  )
}
