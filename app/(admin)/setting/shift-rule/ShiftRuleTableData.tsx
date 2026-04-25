'use client'

import { Card } from 'primereact/card'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'
import { InputText } from 'primereact/inputtext'
import { IconField } from 'primereact/iconfield'
import { InputIcon } from 'primereact/inputicon'
import { FilterMatchMode } from 'primereact/api'
import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog'
import { InputSwitch } from 'primereact/inputswitch'
import { useMemo, useState } from 'react'
import useSWR, { mutate } from 'swr'
import { fetcher } from '@/app/utils/fetcher'
import { ResponseType, ResponseTypeCreateSuccess } from '@/app/types/response-type'
import { isResponseTypeError, getErrorMessage } from '@/app/utils/error-messages'
import { showToast } from '@/store/ToastSlice'
import { useDispatch, useSelector } from 'react-redux'
import { Tag } from 'primereact/tag'
import { Checkbox } from 'primereact/checkbox'
import { RootState } from '@/store/store'
import { hasRole } from '@/app/utils/role-utils'
import { Shift } from '@/app/types/shift'
import { InputNumber } from 'primereact/inputnumber'
import ErrorNotConnectedToApi from '@/app/_components/ErrorNotConnectedToApi'
import LoadingDataTable from '@/app/_components/LoadingDataTable'
import { RadioButton } from 'primereact/radiobutton'
import { Dropdown } from 'primereact/dropdown'
import { ShiftRule } from '@/app/types/shift-rule'
import {
  createShiftRule,
  deleteShiftRule,
  purgeShiftRule,
  restoreShiftRule,
  updateShiftRule
} from '@/app/services/shift-rule-service'

const ROTATION_MODE_OPTIONS = [
  { label: 'Rolling', value: 'ROLLING' },
  { label: 'Change on Specific Day', value: 'CHANGE_ON_DAY' },
]

const CHANGE_DAY_OPTIONS = [
  { label: 'Monday', value: 'MONDAY' },
  { label: 'Tuesday', value: 'TUESDAY' },
  { label: 'Wednesday', value: 'WEDNESDAY' },
  { label: 'Thursday', value: 'THURSDAY' },
  { label: 'Friday', value: 'FRIDAY' },
  { label: 'Saturday', value: 'SATURDAY' },
  { label: 'Sunday', value: 'SUNDAY' },
]

const DEFAULT_RULE_ROW = {
  sequence_no: 1,
  shift_id: '',
  duration_days: 1,
}

const ShiftRuleTableData = () => {
  const dispatch = useDispatch()
  const profileState = useSelector((state: RootState) => state.profile)
  const [selectedData, setSelectedData] = useState<ShiftRule | null>(null)
  const [globalFilterValue, setGlobalFilterValue] = useState('')
  const [filters, setFilters] = useState({
    global: { value: '', matchMode: FilterMatchMode.CONTAINS },
  })
  const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] = useState(false)
  const [isAddNew, setIsAddNew] = useState(false)
  const [visible, setVisible] = useState(false)
  const [popupHeaderTitle, setPopupHeaderTitle] = useState('')

  const {
    control,
    handleSubmit,
    setFocus,
    formState: { isValid },
    reset,
    watch,
    clearErrors,
    setValue,
  } = useForm<ShiftRule>({
    defaultValues: {
      id: 0,
      name: '',
      schedule_type: '',
      base_shift_id: 0,
      is_active: true,
      rotation_mode: 'ROLLING',
      change_day: null,
      rules: [],
    },
  })

  const watchedScheduleType = watch('schedule_type')
  const watchedRotationMode = watch('rotation_mode')

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'rules',
  })

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const _filters = { ...filters }
    _filters.global.value = value

    setFilters(_filters)
    setGlobalFilterValue(value)
  }

  const onIngredientsChange = () => {
    setIsShowDeletedDataChecked(!isShowDeletedDataChecked)
  }

  const onClickNew = () => {
    clearErrors()
    setIsAddNew(true)
    setVisible(true)
    setPopupHeaderTitle('New Shift Rule')
    reset({
      id: 0,
      name: '',
      schedule_type: '',
      base_shift_id: 0,
      is_active: true,
      rotation_mode: 'ROLLING',
      change_day: null,
      rules: [],
    })
  }

  const footerContent = (
    <div className='text-right flex gap-5 justify-end'>
      <Button type="button" label="Cancel" icon="pi pi-times" onClick={() => { setVisible(false) }} className="p-button-text" />
      <Button type="submit" label={isAddNew ? 'Submit' : 'Save'} icon="pi pi-check" />
    </div>
  )

  const { data, error, isLoading } = useSWR<ShiftRule[]>(
    `/api/shift-rule?show_all=${isShowDeletedDataChecked}`,
    fetcher
  )

  const { data: shiftData, error: shiftError, isLoading: shiftIsLoading } = useSWR<Shift[]>(
    `/api/shift`,
    fetcher
  )

  const activeShift = useMemo(() => {
    return shiftData?.filter((a) => a.is_active) ?? []
  }, [shiftData])

  if (isLoading) return <LoadingDataTable />
  if (error) {
    return <ErrorNotConnectedToApi mutateKey='/api/shift-rule?show_all=true' />
  }

  const handleSubmitNew = async (formData: ShiftRule) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await createShiftRule(formData)
      setVisible(false)
      reset()
      mutate(`/api/shift-rule?show_all=${isShowDeletedDataChecked}`)
      dispatch(showToast({ visible: true, severity: 'success', summary: 'success', detail: res.message }))
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: 'error', summary: 'error', detail: getErrorMessage(err, 'message') }))
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: 'error', summary: 'error', detail: err.message }))
      }
    }
  }

  const handleUpdate = async (formData: ShiftRule) => {
    if (!selectedData) {
      dispatch(showToast({ visible: true, severity: 'error', summary: 'error', detail: 'Please select data' }))
      return
    }

    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await updateShiftRule(
        selectedData.id,
        selectedData.row_version,
        formData
      )

      setVisible(false)
      mutate(`/api/shift-rule?show_all=${isShowDeletedDataChecked}`)
      dispatch(showToast({ visible: true, severity: 'success', summary: 'success', detail: res.message }))
      reset()
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: 'error', summary: 'error', detail: getErrorMessage(err, 'message') }))
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: 'error', summary: 'error', detail: err.message }))
      }
    }
  }

  const handleDelete = async (formData: ShiftRule) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await deleteShiftRule(formData.id, formData.row_version)
      setVisible(false)
      reset()
      mutate(`/api/shift-rule?show_all=${isShowDeletedDataChecked}`)
      dispatch(showToast({ visible: true, severity: 'success', summary: 'success', detail: res.message }))
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: 'error', summary: 'error', detail: getErrorMessage(err, 'message') }))
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: 'error', summary: 'error', detail: err.message }))
      }
    }
  }

  const handlePurge = async (formData: ShiftRule) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await purgeShiftRule(formData.id)
      setVisible(false)
      reset()
      mutate(`/api/shift-rule?show_all=${isShowDeletedDataChecked}`)
      dispatch(showToast({ visible: true, severity: 'success', summary: 'success', detail: res.message }))
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: 'error', summary: 'error', detail: getErrorMessage(err, 'message') }))
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: 'error', summary: 'error', detail: err.message }))
      }
    }
  }

  const handleRestore = async (formData: ShiftRule) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await restoreShiftRule(formData.id, formData.row_version)
      setVisible(false)
      reset()
      mutate(`/api/shift-rule?show_all=${isShowDeletedDataChecked}`)
      dispatch(showToast({ visible: true, severity: 'success', summary: 'success', detail: res.message }))
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: 'error', summary: 'error', detail: getErrorMessage(err, 'message') }))
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: 'error', summary: 'error', detail: err.message }))
      }
    }
  }

  const sanitizeSubmitData = (formData: ShiftRule): ShiftRule => {
    const payload = { ...formData }

    if (payload.schedule_type === 'FIXED') {
      payload.rotation_mode = null as any
      payload.change_day = null as any
      payload.rules = []
    }

    if (payload.schedule_type === 'ROTATION') {
      payload.base_shift_id = 0

      if (payload.rotation_mode === 'CHANGE_ON_DAY') {
        payload.rules = (payload.rules ?? []).map((rule) => ({
          ...rule,
          duration_days: 1,
        }))
      } else {
        payload.change_day = null as any
      }
    }

    return payload
  }

  const onSubmit = (formData: ShiftRule) => {
    if (formData.schedule_type === 'ROTATION' && (!formData.rules || formData.rules.length === 0)) {
      dispatch(showToast({
        visible: true,
        severity: 'error',
        summary: 'Validation Error',
        detail: 'At least one rotation pattern is required'
      }))
      return
    }

    if (formData.schedule_type === 'FIXED' && Number(formData.base_shift_id) === 0) {
      dispatch(showToast({
        visible: true,
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Base shift must be selected for a fixed schedule'
      }))
      return
    }

    if (formData.schedule_type === 'ROTATION' && !formData.rotation_mode) {
      dispatch(showToast({
        visible: true,
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Rotation mode is required'
      }))
      return
    }

    if (formData.schedule_type === 'ROTATION' && formData.rotation_mode === 'CHANGE_ON_DAY' && !formData.change_day) {
      dispatch(showToast({
        visible: true,
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please choose the day when the shift changes'
      }))
      return
    }

    if (formData.schedule_type === 'ROTATION' && formData.rotation_mode === 'ROLLING') {
      const hasInvalidDuration = formData.rules?.some((rule) => Number(rule.duration_days ?? 0) <= 0)
      if (hasInvalidDuration) {
        dispatch(showToast({
          visible: true,
          severity: 'error',
          summary: 'Validation Error',
          detail: 'Duration must be greater than 0 for rolling rotation'
        }))
        return
      }
    }

    if (!isValid) return

    const payload = sanitizeSubmitData(formData)

    if (isAddNew) {
      handleSubmitNew(payload)
      return
    }

    if (selectedData) {
      handleUpdate(payload)
    }
  }

  const onClickUpdate = (rowData: ShiftRule) => {
    setVisible(true)
    setIsAddNew(false)
    setPopupHeaderTitle('Update Shift Rule')
    setSelectedData(rowData)

    reset({
      ...rowData,
      rotation_mode: rowData.rotation_mode ?? 'ROLLING',
      change_day: rowData.change_day ?? null,
      rules: rowData.rules ?? [],
    })
  }

  const activeColumnBody = (rowData: ShiftRule) => {
    return rowData.is_active
      ? <Tag value="Active" severity="success" />
      : <Tag value="Inactive" severity="danger" />
  }

  const scheduleTypeColumnBody = (rowData: ShiftRule) => {
    if (rowData.schedule_type === 'FIXED') {
      return <Tag value="Fixed" severity="info" />
    }

    return <Tag value="Rotation" severity="warning" />
  }

  const baseShiftColumnBody = (rowData: ShiftRule) => {
    if (rowData.schedule_type === 'ROTATION') {
      return '-'
    }

    const shift = activeShift.find((item) => item.id === rowData.base_shift_id)
    return shift?.name ?? rowData.base_shift_id ?? '-'
  }

  const rotationModeColumnBody = (rowData: ShiftRule) => {
    if (rowData.schedule_type !== 'ROTATION') {
      return '-'
    }

    if (rowData.rotation_mode === 'CHANGE_ON_DAY') {
      return 'Change on Specific Day'
    }

    return 'Rolling'
  }

  const shiftChangeColumnBody = (rowData: ShiftRule) => {
    if (rowData.schedule_type !== 'ROTATION') {
      return '-'
    }

    if (rowData.rotation_mode === 'CHANGE_ON_DAY') {
      const dayLabel =
        CHANGE_DAY_OPTIONS.find((item) => item.value === rowData.change_day)?.label ??
        rowData.change_day ??
        '-'
      return dayLabel
    }

    return '-'
  }

  const patternSummaryColumnBody = (rowData: ShiftRule) => {
    if (rowData.schedule_type !== 'ROTATION' || !rowData.rules || rowData.rules.length === 0) {
      return '-'
    }

    const orderedRules = [...rowData.rules].sort((a, b) => Number(a.sequence_no ?? 0) - Number(b.sequence_no ?? 0))

    const summary = orderedRules.map((rule) => {
      const shiftName =
        activeShift.find((item) => String(item.id) === String(rule.shift_id))?.name ??
        `Shift ${rule.shift_id}`

      if (rowData.rotation_mode === 'CHANGE_ON_DAY') {
        return `${rule.sequence_no}. ${shiftName}`
      }

      return `${rule.sequence_no}. ${shiftName} (${rule.duration_days}d)`
    })

    return (
      <div className="flex flex-col gap-1">
        {summary.slice(0, 3).map((item, index) => (
          <span key={index} className="text-sm">{item}</span>
        ))}
        {summary.length > 3 && (
          <span className="text-xs text-gray-500">+{summary.length - 3} more</span>
        )}
      </div>
    )
  }

  const actionColumnBody = (rowData: ShiftRule) => {
    return (
      <div className="flex gap-2">
        {hasRole(profileState.role, ['superadmin']) && (
          <Button
            tooltipOptions={{ appendTo: () => document.body, position: 'top' }}
            tooltip='Delete Forever'
            rounded
            severity='secondary'
            icon="pi pi-times"
            size="small"
            onClick={() => { onClickPurge(rowData) }}
          />
        )}

        {hasRole(profileState.role, ['superadmin']) && rowData.deleted_at && (
          <Button
            tooltipOptions={{ appendTo: () => document.body, position: 'top' }}
            tooltip='Restore'
            rounded
            severity='success'
            icon="pi pi-refresh"
            size="small"
            onClick={() => { onClickRestore(rowData) }}
          />
        )}

        {!rowData.deleted_at && (
          <Button
            tooltipOptions={{ appendTo: () => document.body, position: 'top' }}
            tooltip='Delete'
            rounded
            severity='danger'
            icon="pi pi-trash"
            size="small"
            onClick={() => { onClickDelete(rowData) }}
          />
        )}

        <Button
          tooltipOptions={{ appendTo: () => document.body, position: 'top' }}
          tooltip='Update'
          rounded
          severity='help'
          icon="pi pi-pencil"
          size="small"
          onClick={() => { onClickUpdate(rowData) }}
        />
      </div>
    )
  }

  const onClickDelete = (rowData: ShiftRule) => {
    confirmDialog({
      message: 'Do you want to delete this record?',
      header: 'Delete Confirmation',
      icon: 'pi pi-info-circle',
      defaultFocus: 'accept',
      accept: () => {
        setSelectedData(rowData)
        handleDelete(rowData)
      },
      reject: () => { },
      footer: (options) => (
        <div className="flex gap-3 justify-end">
          <Button label="No" icon="pi pi-times" onClick={options.reject} className="p-button-text" />
          <Button label="Yes" icon="pi pi-check" onClick={options.accept} className="p-button-danger" />
        </div>
      )
    })
  }

  const onClickRestore = (rowData: ShiftRule) => {
    confirmDialog({
      message: 'Do you want to restore this record?',
      header: 'Restore Confirmation',
      icon: 'pi pi-info-circle',
      defaultFocus: 'accept',
      accept: () => {
        setSelectedData(rowData)
        handleRestore(rowData)
      },
      reject: () => { },
      footer: (options) => (
        <div className="flex gap-3 justify-end">
          <Button label="No" icon="pi pi-times" onClick={options.reject} className="p-button-text" />
          <Button label="Yes" icon="pi pi-check" onClick={options.accept} className="p-button-success" />
        </div>
      )
    })
  }

  const onClickPurge = (rowData: ShiftRule) => {
    confirmDialog({
      message: 'Do you want to delete this record forever?',
      header: 'Delete Confirmation',
      icon: 'pi pi-info-circle',
      defaultFocus: 'accept',
      accept: () => {
        handlePurge(rowData)
      },
      reject: () => { },
      footer: (options) => (
        <div className="flex gap-3 justify-end">
          <Button label="No" icon="pi pi-times" onClick={options.reject} className="p-button-text" />
          <Button label="Yes" icon="pi pi-check" onClick={options.accept} className="p-button-danger" />
        </div>
      )
    })
  }

  return (
    <>
      <ConfirmDialog />

      <Card>
        <div className="p-4 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b pb-3">
            <div>
              <div className="text-2xl font-semibold">Shift Rule</div>
              <div className="text-sm text-gray-500">
                Manage shift rule master data
              </div>
            </div>

            <div className="flex items-center gap-5">
              <div className="flex align-items-center pl-5">
                <Checkbox
                  inputId="showDeletedData"
                  name="showDeletedData"
                  value="yes"
                  onChange={onIngredientsChange}
                  checked={isShowDeletedDataChecked}
                />
                <label htmlFor="showDeletedData" className="ml-2">Show deleted data</label>
              </div>

              <IconField iconPosition="left">
                <InputIcon className="pi pi-search" />
                <InputText
                  className="p-inputtext-sm"
                  value={globalFilterValue}
                  onChange={onGlobalFilterChange}
                  placeholder="Keyword Search"
                />
              </IconField>

              <Button label="New" icon="pi pi-plus" size="small" onClick={onClickNew} />
            </div>
          </div>

          <DataTable
            value={data}
            tableStyle={{ minWidth: '78rem' }}
            stripedRows
            paginator
            scrollable
            scrollHeight="500px"
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            dataKey="id"
            globalFilterFields={['name']}
            emptyMessage="No Shift Rule found."
            header={<></>}
            filters={filters}
            currentPageReportTemplate="{first} to {last} of {totalRecords}"
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            loading={isLoading}
          >
            <Column header="#" headerStyle={{ width: '3rem' }} body={(rowData, options) => options.rowIndex + 1}></Column>
            <Column field="name" header="Name" sortable></Column>
            <Column header="Schedule Type" body={scheduleTypeColumnBody}></Column>
            <Column header="Rotation Mode" body={rotationModeColumnBody}></Column>
            <Column header="Shift Change" body={shiftChangeColumnBody}></Column>
            <Column header="Base Shift" body={baseShiftColumnBody}></Column>
            <Column header="Pattern Summary" body={patternSummaryColumnBody}></Column>
            <Column field="is_active" header="Status" body={activeColumnBody}></Column>
            <Column
              headerClassName='bg-white'
              className='bg-white'
              header="Action"
              body={(rowData) => actionColumnBody(rowData)}
              frozen={true}
              alignFrozen="right"
            ></Column>
          </DataTable>
        </div>
      </Card>

      <form onSubmit={handleSubmit((formData) => onSubmit(formData))}>
        <Dialog
          header={popupHeaderTitle}
          visible={visible}
          style={{ width: '62vw' }}
          onHide={() => { if (!visible) return; setVisible(false); reset() }}
          footer={footerContent}
          onShow={() => {
            setFocus('name')
          }}
        >
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2">
                <label htmlFor="name">Rule Name</label>
                <Controller
                  name="name"
                  control={control}
                  rules={{
                    required: '*required',
                    maxLength: { value: 50, message: 'maximum 50 character' }
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <InputText
                        id="name"
                        placeholder="Example: Security Weekly Rotation"
                        {...field}
                        className={fieldState.invalid ? 'p-invalid' : ''}
                      />
                      {fieldState.error && (
                        <small className="font-bold p-error">{fieldState.error.message}</small>
                      )}
                    </>
                  )}
                />
              </div>


            </div>

            <div className="flex flex-col gap-2">
              <label>Schedule Type</label>
              <Controller
                name="schedule_type"
                control={control}
                rules={{ required: '*required' }}
                render={({ field, fieldState }) => (
                  <>
                    <div className="flex gap-6">
                      <div className="flex align-items-center">
                        <RadioButton
                          inputId="fixed"
                          value="FIXED"
                          onChange={(e) => {
                            field.onChange(e.value)
                            setValue('rotation_mode', null as any)
                            setValue('change_day', null as any)
                            replace([])
                          }}
                          checked={field.value === 'FIXED'}
                        />
                        <label htmlFor="fixed" className="ml-2">Fixed</label>
                      </div>

                      <div className="flex align-items-center">
                        <RadioButton
                          inputId="rotation"
                          value="ROTATION"
                          onChange={(e) => {
                            field.onChange(e.value)
                            setValue('rotation_mode', watch('rotation_mode') ?? 'ROLLING')
                            setValue('base_shift_id', 0 as any)
                          }}
                          checked={field.value === 'ROTATION'}
                        />
                        <label htmlFor="rotation" className="ml-2">Rotation</label>
                      </div>
                    </div>

                    {fieldState.error && (
                      <small className="font-bold p-error">{fieldState.error.message}</small>
                    )}
                  </>
                )}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label>Status</label>
              <Controller
                name="is_active"
                control={control}
                defaultValue={true}
                render={({ field }) => (
                  <div className="flex items-center gap-3 pt-2">
                    <InputSwitch
                      id="is_active"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.value)}
                    />
                    <span className="text-sm text-gray-600">
                      {field.value ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                )}
              />
            </div>

            {watchedScheduleType === 'FIXED' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label htmlFor="base_shift_id">Base Shift</label>
                  <Controller
                    name="base_shift_id"
                    control={control}
                    render={({ field, fieldState }) => (
                      <>
                        <Dropdown
                          id="base_shift_id"
                          appendTo={() => document.body}
                          value={field.value}
                          options={activeShift}
                          loading={shiftIsLoading}
                          disabled={shiftIsLoading || !!shiftError}
                          onChange={(e) => field.onChange(e.value)}
                          optionLabel="name"
                          optionValue="id"
                          placeholder={shiftIsLoading ? 'Loading shifts...' : 'Select a shift'}
                          className={fieldState.invalid ? 'p-invalid' : ''}
                        />
                        {fieldState.error && (
                          <small className="font-bold p-error">{fieldState.error.message}</small>
                        )}
                        {shiftError && (
                          <small className="p-error font-bold">
                            We couldn’t load the list of shifts. Please try again.
                          </small>
                        )}
                      </>
                    )}
                  />
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  Fixed rules use one base shift. Weekend handling follows your backend policy.
                </div>
              </div>
            )}

            {watchedScheduleType === 'ROTATION' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="rotation_mode">Rotation Mode</label>
                    <Controller
                      name="rotation_mode"
                      control={control}
                      render={({ field, fieldState }) => (
                        <>
                          <Dropdown
                            id="rotation_mode"
                            appendTo={() => document.body}
                            value={field.value}
                            options={ROTATION_MODE_OPTIONS}
                            onChange={(e) => {
                              field.onChange(e.value)

                              if (e.value !== 'CHANGE_ON_DAY') {
                                setValue('change_day', null as any)
                              }

                              const currentRules = watch('rules') ?? []
                              if (e.value === 'CHANGE_ON_DAY' && currentRules.length > 0) {
                                const updatedRules = currentRules.map((item) => ({
                                  ...item,
                                  duration_days: 1,
                                }))
                                replace(updatedRules as any)
                              }
                            }}
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Select rotation mode"
                            className={fieldState.invalid ? 'p-invalid' : ''}
                          />
                          {fieldState.error && (
                            <small className="font-bold p-error">{fieldState.error.message}</small>
                          )}
                        </>
                      )}
                    />
                  </div>

                  {watchedRotationMode === 'CHANGE_ON_DAY' && (
                    <div className="flex flex-col gap-2">
                      <label htmlFor="change_day">Change Shift On</label>
                      <Controller
                        name="change_day"
                        control={control}
                        render={({ field, fieldState }) => (
                          <>
                            <Dropdown
                              id="change_day"
                              appendTo={() => document.body}
                              value={field.value}
                              options={CHANGE_DAY_OPTIONS}
                              onChange={(e) => field.onChange(e.value)}
                              optionLabel="label"
                              optionValue="value"
                              placeholder="Select a day"
                              className={fieldState.invalid ? 'p-invalid' : ''}
                            />
                            {fieldState.error && (
                              <small className="font-bold p-error">{fieldState.error.message}</small>
                            )}
                          </>
                        )}
                      />
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  {watchedRotationMode === 'CHANGE_ON_DAY'
                    ? 'The shift changes when the selected day is reached. Example: if Monday is selected, the next pattern starts on Monday.'
                    : 'Rolling rotation follows the duration of each pattern row.'}
                </div>

                <div className="flex flex-col gap-3">
                  <div>
                    <h1 className="font-semibold">Rotation Pattern</h1>
                    <p className="text-sm text-gray-500">
                      Define the order of shifts used by this rotation rule.
                    </p>
                  </div>

                  <div className="max-h-72 overflow-y-auto overflow-x-auto border rounded-md">
                    <table className="min-w-[700px] w-full border-separate border-spacing-x-3 border-spacing-y-2">
                      <thead className="sticky top-0 bg-gray-100 z-10">
                        <tr className="font-semibold text-gray-600">
                          <th className="w-24 text-center">Sequence</th>
                          <th className="text-left">Shift</th>
                          {watchedRotationMode !== 'CHANGE_ON_DAY' && (
                            <th className="w-32 text-center">Duration (Days)</th>
                          )}
                          <th className="w-20 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fields.map((item, index) => (
                          <tr key={item.id}>
                            <td className="text-center align-top bg-white rounded-md shadow-sm">
                              <Controller
                                name={`rules.${index}.sequence_no`}
                                control={control}
                                rules={{
                                  required: 'Sequence is required',
                                  validate: (val) => Number(val) > 0 || 'Sequence must be greater than 0',
                                }}
                                render={({ field, fieldState }) => (
                                  <div className="flex flex-col items-center">
                                    <InputNumber
                                      inputRef={field.ref}
                                      value={field.value ?? null}
                                      onValueChange={(e) => field.onChange(e.value)}
                                      placeholder="#"
                                      className={fieldState.error ? 'p-invalid' : ''}
                                    />
                                    {fieldState.error && (
                                      <small className="p-error">{fieldState.error.message}</small>
                                    )}
                                  </div>
                                )}
                              />
                            </td>

                            <td className="align-top bg-white rounded-md shadow-sm">
                              <Controller
                                name={`rules.${index}.shift_id`}
                                control={control}
                                rules={{ required: 'Shift is required' }}
                                render={({ field, fieldState }) => (
                                  <div className="flex flex-col">
                                    <Dropdown
                                      appendTo={() => document.body}
                                      value={field.value}
                                      onChange={(e) => field.onChange(e.value)}
                                      options={activeShift}
                                      optionLabel="name"
                                      optionValue="id"
                                      placeholder="Select shift"
                                      className={`w-full ${fieldState.error ? 'p-invalid' : ''}`}
                                    />
                                    {fieldState.error && (
                                      <small className="p-error">{fieldState.error.message}</small>
                                    )}
                                  </div>
                                )}
                              />
                            </td>

                            {watchedRotationMode !== 'CHANGE_ON_DAY' && (
                              <td className="text-center align-top bg-white rounded-md shadow-sm">
                                <Controller
                                  name={`rules.${index}.duration_days`}
                                  control={control}
                                  rules={{
                                    required: 'Duration is required',
                                    validate: (val) => Number(val) > 0 || 'Duration must be greater than 0',
                                  }}
                                  render={({ field, fieldState }) => (
                                    <div className="flex flex-col items-center">
                                      <InputNumber
                                        inputRef={field.ref}
                                        value={field.value ?? null}
                                        onValueChange={(e) => field.onChange(e.value)}
                                        placeholder="Days"
                                        className={fieldState.error ? 'p-invalid' : ''}
                                      />
                                      {fieldState.error && (
                                        <small className="p-error">{fieldState.error.message}</small>
                                      )}
                                    </div>
                                  )}
                                />
                              </td>
                            )}

                            <td className="text-center bg-white rounded-md shadow-sm">
                              <Button
                                type="button"
                                icon="pi pi-trash"
                                severity="danger"
                                text
                                onClick={() => remove(index)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <Button
                      type="button"
                      label="Add Pattern"
                      icon="pi pi-plus"
                      onClick={() =>
                        append({
                          ...DEFAULT_RULE_ROW,
                          sequence_no: fields.length + 1,
                          duration_days: watchedRotationMode === 'CHANGE_ON_DAY' ? 1 : 1,
                        } as any)
                      }
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </Dialog>
      </form>
    </>
  )
}

export default ShiftRuleTableData