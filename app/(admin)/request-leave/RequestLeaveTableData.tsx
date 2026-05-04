'use client';

import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import useSWR, { mutate } from 'swr';
import dayjs from 'dayjs';

import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { FilterMatchMode } from 'primereact/api';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import { InputText } from 'primereact/inputtext';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { InputTextarea } from 'primereact/inputtextarea';
import { Tag } from 'primereact/tag';

import { fetcher } from '@/app/utils/fetcher';
import LoadingDataTable from '@/app/_components/LoadingDataTable';
import ErrorNotConnectedToApi from '@/app/_components/ErrorNotConnectedToApi';
import { isResponseTypeError, getErrorMessage } from '@/app/utils/error-messages';
import { showToast } from '@/store/ToastSlice';
import { RootState } from '@/store/store';
import { hasRole } from '@/app/utils/role-utils';

import { useDispatch, useSelector } from 'react-redux';

import { ResponseType, ResponseTypeCreateSuccess } from '@/app/types/response-type';
import { LeaveType } from '@/app/types/leave-type';
import { EmployeeLeaveBalance } from '@/app/types/employee-leave-balance';
import {
  RequestLeave,
  RequestLeaveForm,
  defaultRequestLeaveFormValue,
} from '@/app/types/request-leave';
import { RequestLeaveAttachment } from '@/app/types/request-leave-attachment';

import {
  createRequestLeave,
  deleteRequestLeave,
  getPreviewWorkingDays,
  purgeRequestLeave,
  restoreRequestLeave,
  updateRequestLeave,
} from '@/app/services/request-leave-service';

import {
  uploadRequestLeaveAttachment,
  getRequestLeaveAttachments,
  deleteRequestLeaveAttachment,
} from '@/app/services/request-leave-attachment-service';

const getBody = () => document.body;

const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;

const allowedAttachmentTypes = [
  'image/jpeg',
  'image/png',
  'application/pdf',
];

const allowedAttachmentAccept = '.jpg,.jpeg,.png,.pdf';

const RequestLeaveTableData = () => {
  const dispatch = useDispatch();
  const profileState = useSelector((state: RootState) => state.profile);

  const [selectedData, setSelectedData] = useState<RequestLeave | null>(null);
  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const [isAddNew, setIsAddNew] = useState(false);
  const [visible, setVisible] = useState(false);
  const [popupHeaderTitle, setPopupHeaderTitle] = useState('New Request Leave');
  const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const [attachmentDialogVisible, setAttachmentDialogVisible] = useState(false);
  const [attachmentRows, setAttachmentRows] = useState<RequestLeaveAttachment[]>([]);
  const [attachmentLoading, setAttachmentLoading] = useState(false);
  const [attachmentRequestLeave, setAttachmentRequestLeave] = useState<RequestLeave | null>(null);
  const [openingAttachmentId, setOpeningAttachmentId] = useState<number | null>(null);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<number | null>(null);

  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState('');
  const [previewFileContentType, setPreviewFileContentType] = useState('');

  const currentKey = `/api/request-leave?show_all=${isShowDeletedDataChecked}`;

  const {
    control,
    handleSubmit,
    setFocus,
    reset,
    clearErrors,
    watch,
    setValue,
    formState: { isValid },
  } = useForm<RequestLeaveForm>({
    defaultValues: defaultRequestLeaveFormValue,
    mode: 'onTouched',
  });

  const [filters, setFilters] = useState({
    global: { value: '', matchMode: FilterMatchMode.CONTAINS },
  });

  const {
    data: requestLeaveData,
    error,
    isLoading,
  } = useSWR<RequestLeave[]>(currentKey, fetcher);

  const {
    data: leaveTypeData,
    error: leaveTypeError,
    isLoading: leaveTypeIsLoading,
  } = useSWR<LeaveType[]>('/api/leave-type', fetcher);

  const {
    data: employeeLeaveBalanceData,
    error: employeeLeaveBalanceError,
    isLoading: employeeLeaveBalanceIsLoading,
  } = useSWR<EmployeeLeaveBalance[]>('/api/employees/leave-balance', fetcher);

  const requestRows = requestLeaveData ?? [];

  const selectedLeaveTypeId = watch('leave_type_id');
  const selectedBalanceId = watch('employee_leave_balance_id');
  const startDate = watch('start_date');
  const endDate = watch('end_date');
  const totalDays = watch('total_days') || 0;

  const requestSummary = useMemo(() => {
    const pending = requestRows.filter(
      (item) => item.status?.toUpperCase() === 'PENDING' && !item.deleted_at
    ).length;

    const approved = requestRows.filter(
      (item) => item.status?.toUpperCase() === 'APPROVED' && !item.deleted_at
    ).length;

    const rejected = requestRows.filter(
      (item) => item.status?.toUpperCase() === 'REJECTED' && !item.deleted_at
    ).length;

    return { pending, approved, rejected };
  }, [requestRows]);

  const activeLeaveTypes = useMemo(() => {
    return (leaveTypeData ?? []).filter((item) => item.is_active);
  }, [leaveTypeData]);

  const leaveTypeNameMap = useMemo(() => {
    const map = new Map<number, string>();

    (leaveTypeData ?? []).forEach((item) => {
      map.set(item.id, item.name);
    });

    return map;
  }, [leaveTypeData]);

  const selectedLeaveType = useMemo(() => {
    return (leaveTypeData ?? []).find(
      (item) => item.id === Number(selectedLeaveTypeId)
    );
  }, [leaveTypeData, selectedLeaveTypeId]);

  const availableLeaveBalances = useMemo(() => {
    const balances = employeeLeaveBalanceData ?? [];

    if (!selectedLeaveTypeId || Number(selectedLeaveTypeId) <= 0) {
      return balances.filter((item) => !item.deleted_at);
    }

    return balances.filter(
      (item) =>
        item.leave_type_id === Number(selectedLeaveTypeId) &&
        !item.deleted_at
    );
  }, [employeeLeaveBalanceData, selectedLeaveTypeId]);

  const selectedBalance = useMemo(() => {
    return (employeeLeaveBalanceData ?? []).find(
      (item) => item.id === Number(selectedBalanceId)
    );
  }, [employeeLeaveBalanceData, selectedBalanceId]);

  useEffect(() => {
    let isMounted = true;

    const calculatePreview = async () => {
      if (!startDate || !endDate) {
        setValue('total_days', 0);
        return;
      }

      if (dayjs(endDate).isBefore(startDate, 'day')) {
        setValue('total_days', 0);
        return;
      }

      try {
        setIsPreviewLoading(true);

        const total = await getPreviewWorkingDays(startDate, endDate);

        if (isMounted) {
          setValue('total_days', total);
        }
      } catch (err: unknown) {
        if (!isMounted) {
          return;
        }

        setValue('total_days', 0);

        if (isResponseTypeError(err)) {
          dispatch(
            showToast({
              visible: true,
              severity: 'error',
              summary: 'Error',
              detail: getErrorMessage(err, 'message'),
            })
          );
        } else if (err instanceof Error) {
          dispatch(
            showToast({
              visible: true,
              severity: 'error',
              summary: 'Error',
              detail: err.message,
            })
          );
        }
      } finally {
        if (isMounted) {
          setIsPreviewLoading(false);
        }
      }
    };

    void calculatePreview();

    return () => {
      isMounted = false;
    };
  }, [startDate, endDate, setValue, dispatch]);

  useEffect(() => {
    if (!selectedBalanceId) {
      return;
    }

    const exists = availableLeaveBalances.some(
      (item) => item.id === Number(selectedBalanceId)
    );

    if (!exists) {
      setValue('employee_leave_balance_id', 0);
    }
  }, [availableLeaveBalances, selectedBalanceId, setValue]);

  useEffect(() => {
    return () => {
      if (previewFileUrl) {
        URL.revokeObjectURL(previewFileUrl);
      }
    };
  }, [previewFileUrl]);

  const clearPreviewFile = () => {
    if (previewFileUrl) {
      URL.revokeObjectURL(previewFileUrl);
    }

    setPreviewFileUrl(null);
    setPreviewFileName('');
    setPreviewFileContentType('');
  };

  const parseBlobError = async (res: Response) => {
    const contentType = res.headers.get('Content-Type') ?? '';

    try {
      if (contentType.includes('application/json')) {
        const errorBody = await res.json();
        return errorBody?.message ?? 'Failed to open attachment.';
      }

      const text = await res.text();
      return text || 'Failed to open attachment.';
    } catch {
      return 'Failed to open attachment.';
    }
  };

  const fetchSecureAttachmentBlob = async (
    requestLeaveId: number,
    attachmentId: number
  ) => {
    const res = await fetch(
      `/api/request-leave/${requestLeaveId}/attachments/${attachmentId}/view`,
      {
        method: 'GET',
        credentials: 'include',
      }
    );

    if (!res.ok) {
      const message = await parseBlobError(res);
      throw new Error(message);
    }

    return res.blob();
  };

  const previewAttachmentSecurely = async (item: RequestLeaveAttachment) => {
    try {
      setOpeningAttachmentId(item.id);

      const blob = await fetchSecureAttachmentBlob(
        item.employee_leave_id,
        item.id
      );

      const contentType = blob.type || item.content_type;

      if (
        !contentType.startsWith('image/') &&
        contentType !== 'application/pdf'
      ) {
        dispatch(
          showToast({
            visible: true,
            severity: 'warn',
            summary: 'Preview not available',
            detail: 'Only image and PDF attachments can be previewed.',
          })
        );
        return;
      }

      clearPreviewFile();

      const blobUrl = URL.createObjectURL(blob);

      setPreviewFileUrl(blobUrl);
      setPreviewFileName(item.original_file_name);
      setPreviewFileContentType(contentType);
    } catch (err: unknown) {
      if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: 'error',
            summary: 'Error',
            detail: err.message,
          })
        );
      }
    } finally {
      setOpeningAttachmentId(null);
    }
  };

  const downloadAttachmentSecurely = async (item: RequestLeaveAttachment) => {
    try {
      setDownloadingAttachmentId(item.id);

      const blob = await fetchSecureAttachmentBlob(
        item.employee_leave_id,
        item.id
      );

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = blobUrl;
      link.download = item.original_file_name || 'attachment';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 60_000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: 'error',
            summary: 'Error',
            detail: err.message,
          })
        );
      }
    } finally {
      setDownloadingAttachmentId(null);
    }
  };

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    setFilters({
      global: { value, matchMode: FilterMatchMode.CONTAINS },
    });

    setGlobalFilterValue(value);
  };

  const refreshData = async () => {
    await mutate(currentKey);
  };

  const refreshAttachmentRows = async (requestLeaveId: number) => {
    const attachments = await getRequestLeaveAttachments(requestLeaveId);
    setAttachmentRows(attachments);
  };

  const handleDialogHide = () => {
    setVisible(false);
    setSelectedData(null);
    setIsAddNew(false);
    setIsPreviewLoading(false);
    reset(defaultRequestLeaveFormValue);
  };

  const handleAttachmentDialogHide = () => {
    clearPreviewFile();
    setAttachmentDialogVisible(false);
    setAttachmentRows([]);
    setAttachmentRequestLeave(null);
    setOpeningAttachmentId(null);
    setDownloadingAttachmentId(null);
  };

  const onClickNew = () => {
    clearErrors();
    setSelectedData(null);
    setIsAddNew(true);
    setVisible(true);
    setPopupHeaderTitle('New Request Leave');
    reset(defaultRequestLeaveFormValue);

    setTimeout(() => {
      setFocus('leave_type_id');
    }, 0);
  };

  const onClickUpdate = (data: RequestLeave) => {
    clearErrors();
    setSelectedData(data);
    setIsAddNew(false);
    setVisible(true);
    setPopupHeaderTitle('Update Request Leave');

    reset({
      id: data.id,
      leave_type_id: data.leave_type_id,
      employee_leave_balance_id: data.employee_leave_balance_id,
      start_date: data.start_date ? dayjs(data.start_date).toDate() : null,
      end_date: data.end_date ? dayjs(data.end_date).toDate() : null,
      reason: data.reason,
      total_days: data.total_days,
      attachment_file: null,
      deleted_at: data.deleted_at,
      row_version: data.row_version,
    });

    setTimeout(() => {
      setFocus('leave_type_id');
    }, 0);
  };

  const onClickViewAttachments = async (data: RequestLeave) => {
    try {
      setAttachmentLoading(true);
      setAttachmentRequestLeave(data);
      setAttachmentDialogVisible(true);
      clearPreviewFile();

      await refreshAttachmentRows(data.id);
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: 'error',
            summary: 'Error',
            detail: getErrorMessage(err, 'message'),
          })
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: 'error',
            summary: 'Error',
            detail: err.message,
          })
        );
      }
    } finally {
      setAttachmentLoading(false);
    }
  };

  const uploadAttachmentIfAny = async (
    requestLeaveId: number,
    file: File | null
  ) => {
    if (!file) {
      return;
    }

    await uploadRequestLeaveAttachment(requestLeaveId, file);
  };

  const handleSubmitNew = async (data: RequestLeaveForm) => {
    try {
      setIsSaving(true);

      const res: ResponseType<ResponseTypeCreateSuccess> =
        await createRequestLeave(data);

      const newRequestId = Number(res.data?.id ?? 0);

      if (newRequestId > 0 && data.attachment_file) {
        try {
          await uploadAttachmentIfAny(newRequestId, data.attachment_file);
        } catch (uploadErr: unknown) {
          await refreshData();
          handleDialogHide();

          if (isResponseTypeError(uploadErr)) {
            dispatch(
              showToast({
                visible: true,
                severity: 'warn',
                summary: 'Request Created, Attachment Failed',
                detail:
                  getErrorMessage(uploadErr, 'message') ||
                  'Leave request was created, but attachment upload failed. Please update the request and upload the attachment again.',
              })
            );
          } else if (uploadErr instanceof Error) {
            dispatch(
              showToast({
                visible: true,
                severity: 'warn',
                summary: 'Request Created, Attachment Failed',
                detail: uploadErr.message,
              })
            );
          } else {
            dispatch(
              showToast({
                visible: true,
                severity: 'warn',
                summary: 'Request Created, Attachment Failed',
                detail:
                  'Leave request was created, but attachment upload failed. Please update the request and upload the attachment again.',
              })
            );
          }

          return;
        }
      }

      await refreshData();
      handleDialogHide();

      dispatch(
        showToast({
          visible: true,
          severity: 'success',
          summary: 'Success',
          detail: res.message || 'Leave request created successfully.',
        })
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: 'error',
            summary: 'Error',
            detail: getErrorMessage(err, 'message'),
          })
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: 'error',
            summary: 'Error',
            detail: err.message,
          })
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (data: RequestLeaveForm) => {
    if (!selectedData) {
      dispatch(
        showToast({
          visible: true,
          severity: 'error',
          summary: 'Error',
          detail: 'Please select data first.',
        })
      );
      return;
    }

    try {
      setIsSaving(true);

      const res: ResponseType<ResponseTypeCreateSuccess> =
        await updateRequestLeave(selectedData.id, selectedData.row_version, data);

      if (data.attachment_file) {
        await uploadAttachmentIfAny(selectedData.id, data.attachment_file);
      }

      await refreshData();
      handleDialogHide();

      dispatch(
        showToast({
          visible: true,
          severity: 'success',
          summary: 'Success',
          detail: res.message || 'Leave request updated successfully.',
        })
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: 'error',
            summary: 'Error',
            detail: getErrorMessage(err, 'message'),
          })
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: 'error',
            summary: 'Error',
            detail: err.message,
          })
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (data: RequestLeave) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await deleteRequestLeave(data.id, data.row_version);

      await refreshData();

      dispatch(
        showToast({
          visible: true,
          severity: 'success',
          summary: 'Success',
          detail: res.message || 'Leave request deleted successfully.',
        })
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: 'error',
            summary: 'Error',
            detail: getErrorMessage(err, 'message'),
          })
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: 'error',
            summary: 'Error',
            detail: err.message,
          })
        );
      }
    }
  };

  const handlePurge = async (data: RequestLeave) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await purgeRequestLeave(data.id);

      await refreshData();

      dispatch(
        showToast({
          visible: true,
          severity: 'success',
          summary: 'Success',
          detail: res.message || 'Leave request deleted permanently.',
        })
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: 'error',
            summary: 'Error',
            detail: getErrorMessage(err, 'message'),
          })
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: 'error',
            summary: 'Error',
            detail: err.message,
          })
        );
      }
    }
  };

  const handleRestore = async (data: RequestLeave) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await restoreRequestLeave(data.id, data.row_version);

      await refreshData();

      dispatch(
        showToast({
          visible: true,
          severity: 'success',
          summary: 'Success',
          detail: res.message || 'Leave request restored successfully.',
        })
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: 'error',
            summary: 'Error',
            detail: getErrorMessage(err, 'message'),
          })
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: 'error',
            summary: 'Error',
            detail: err.message,
          })
        );
      }
    }
  };

  const handleDeleteAttachment = async (item: RequestLeaveAttachment) => {
    if (!attachmentRequestLeave) {
      return;
    }

    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await deleteRequestLeaveAttachment(
          attachmentRequestLeave.id,
          item.id,
          item.row_version
        );

      if (previewFileUrl && previewFileName === item.original_file_name) {
        clearPreviewFile();
      }

      await refreshAttachmentRows(attachmentRequestLeave.id);
      await refreshData();

      dispatch(
        showToast({
          visible: true,
          severity: 'success',
          summary: 'Success',
          detail: res.message || 'Attachment deleted successfully.',
        })
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: 'error',
            summary: 'Error',
            detail: getErrorMessage(err, 'message'),
          })
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: 'error',
            summary: 'Error',
            detail: err.message,
          })
        );
      }
    }
  };

  const onClickDeleteAttachment = (item: RequestLeaveAttachment) => {
    confirmDialog({
      message: 'Do you want to delete this attachment?',
      header: 'Delete Attachment Confirmation',
      icon: 'pi pi-info-circle',
      defaultFocus: 'accept',
      accept: () => handleDeleteAttachment(item),
      reject: () => { },
      footer: (options) => (
        <div className="flex justify-end gap-3">
          <Button
            label="No"
            icon="pi pi-times"
            onClick={options.reject}
            className="p-button-text"
          />
          <Button
            label="Yes"
            icon="pi pi-check"
            onClick={options.accept}
            className="p-button-danger"
          />
        </div>
      ),
    });
  };

  const onSubmit = async (data: RequestLeaveForm) => {
    if (!isValid || isSaving || isPreviewLoading) {
      return;
    }

    let requestedDays = 0;

    try {
      setIsPreviewLoading(true);
      requestedDays = await getPreviewWorkingDays(data.start_date, data.end_date);
      setValue('total_days', requestedDays);
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: 'error',
            summary: 'Error',
            detail: getErrorMessage(err, 'message'),
          })
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: 'error',
            summary: 'Error',
            detail: err.message,
          })
        );
      }

      return;
    } finally {
      setIsPreviewLoading(false);
    }

    if (requestedDays <= 0) {
      dispatch(
        showToast({
          visible: true,
          severity: 'error',
          summary: 'Invalid request',
          detail: 'Selected date range has no working days.',
        })
      );
      return;
    }

    if (selectedBalance && requestedDays > selectedBalance.closing_balance) {
      dispatch(
        showToast({
          visible: true,
          severity: 'error',
          summary: 'Insufficient balance',
          detail: 'Requested days exceed the selected leave balance closing amount.',
        })
      );
      return;
    }

    if (isAddNew) {
      await handleSubmitNew(data);
      return;
    }

    await handleUpdate(data);
  };

  const onClickDelete = (data: RequestLeave) => {
    confirmDialog({
      message: 'Do you want to delete this request?',
      header: 'Delete Confirmation',
      icon: 'pi pi-info-circle',
      defaultFocus: 'accept',
      accept: () => handleDelete(data),
      reject: () => { },
      footer: (options) => (
        <div className="flex justify-end gap-3">
          <Button
            label="No"
            icon="pi pi-times"
            onClick={options.reject}
            className="p-button-text"
          />
          <Button
            label="Yes"
            icon="pi pi-check"
            onClick={options.accept}
            className="p-button-danger"
          />
        </div>
      ),
    });
  };

  const onClickRestore = (data: RequestLeave) => {
    confirmDialog({
      message: 'Do you want to restore this request?',
      header: 'Restore Confirmation',
      icon: 'pi pi-info-circle',
      defaultFocus: 'accept',
      accept: () => handleRestore(data),
      reject: () => { },
      footer: (options) => (
        <div className="flex justify-end gap-3">
          <Button
            label="No"
            icon="pi pi-times"
            onClick={options.reject}
            className="p-button-text"
          />
          <Button
            label="Yes"
            icon="pi pi-check"
            onClick={options.accept}
            className="p-button-success"
          />
        </div>
      ),
    });
  };

  const onClickPurge = (data: RequestLeave) => {
    confirmDialog({
      message: 'Do you want to delete this request forever?',
      header: 'Delete Forever Confirmation',
      icon: 'pi pi-info-circle',
      defaultFocus: 'accept',
      accept: () => handlePurge(data),
      reject: () => { },
      footer: (options) => (
        <div className="flex justify-end gap-3">
          <Button
            label="No"
            icon="pi pi-times"
            onClick={options.reject}
            className="p-button-text"
          />
          <Button
            label="Yes"
            icon="pi pi-check"
            onClick={options.accept}
            className="p-button-danger"
          />
        </div>
      ),
    });
  };

  const leaveTypeBody = (rowData: RequestLeave) => {
    return rowData.leave_name || leaveTypeNameMap.get(rowData.leave_type_id) || '-';
  };

  const dateRangeBody = (rowData: RequestLeave) => {
    return `${dayjs(rowData.start_date).format('DD MMM YYYY')} - ${dayjs(
      rowData.end_date
    ).format('DD MMM YYYY')}`;
  };

  const processedAtBody = (rowData: RequestLeave) => {
    if (!rowData.approved_at) {
      return '-';
    }

    return dayjs(rowData.approved_at).format('DD MMM YYYY HH:mm');
  };

  const statusBody = (rowData: RequestLeave) => {
    if (rowData.deleted_at) {
      return <Tag value="Deleted" severity="secondary" />;
    }

    const status = (rowData.status || '').toUpperCase();

    if (status === 'APPROVED') {
      return <Tag value="Approved" severity="success" />;
    }

    if (status === 'REJECTED') {
      return <Tag value="Rejected" severity="danger" />;
    }

    if (status === 'CANCELLED') {
      return <Tag value="Cancelled" severity="warning" />;
    }

    return <Tag value="Pending" severity="info" />;
  };

  const attachmentBody = (rowData: RequestLeave) => {
    const attachmentCount = rowData.attachment_count ?? 0;

    if (rowData.requires_attachment && attachmentCount <= 0) {
      return <Tag value="Required" severity="danger" />;
    }

    if (attachmentCount > 0) {
      return <Tag value={`${attachmentCount} file(s)`} severity="success" />;
    }

    return <Tag value="None" severity="secondary" />;
  };

  const actionColumnBody = (rowData: RequestLeave) => {
    const isPending =
      rowData.status?.toUpperCase() === 'PENDING' && !rowData.deleted_at;

    const isFinalStatus =
      rowData.status?.toUpperCase() === 'APPROVED' ||
      rowData.status?.toUpperCase() === 'REJECTED' ||
      rowData.status?.toUpperCase() === 'CANCELLED';

    return (
      <div className="flex flex-wrap gap-2">
        <Button
          tooltipOptions={{ appendTo: getBody, position: 'top' }}
          tooltip="attachments"
          rounded
          severity="info"
          icon="pi pi-paperclip"
          size="small"
          onClick={() => onClickViewAttachments(rowData)}
        />

        {hasRole(profileState.role, ['superadmin']) && rowData.deleted_at && (
          <Button
            tooltipOptions={{ appendTo: getBody, position: 'top' }}
            tooltip="restore"
            rounded
            severity="success"
            icon="pi pi-refresh"
            size="small"
            onClick={() => onClickRestore(rowData)}
          />
        )}

        {hasRole(profileState.role, ['superadmin']) && rowData.deleted_at && (
          <Button
            tooltipOptions={{ appendTo: getBody, position: 'top' }}
            tooltip="delete forever"
            rounded
            severity="secondary"
            icon="pi pi-times"
            size="small"
            onClick={() => onClickPurge(rowData)}
          />
        )}

        {!rowData.deleted_at && (
          <>
            <Button
              tooltipOptions={{ appendTo: getBody, position: 'top' }}
              tooltip="delete"
              rounded
              severity="danger"
              icon="pi pi-trash"
              size="small"
              disabled={!isPending}
              onClick={() => onClickDelete(rowData)}
            />

            <Button
              tooltipOptions={{ appendTo: getBody, position: 'top' }}
              tooltip="update"
              rounded
              severity="help"
              icon="pi pi-pencil"
              size="small"
              disabled={isFinalStatus}
              onClick={() => onClickUpdate(rowData)}
            />
          </>
        )}
      </div>
    );
  };

  const footerContent = (
    <div className="flex justify-end gap-3">
      <Button
        type="button"
        label="Cancel"
        icon="pi pi-times"
        onClick={handleDialogHide}
        className="p-button-text"
        disabled={isSaving || isPreviewLoading}
      />
      <Button
        type="submit"
        label={
          isSaving
            ? isAddNew
              ? 'Submitting...'
              : 'Saving...'
            : isPreviewLoading
              ? 'Calculating...'
              : isAddNew
                ? 'Submit'
                : 'Save'
        }
        icon={isSaving || isPreviewLoading ? 'pi pi-spin pi-spinner' : 'pi pi-check'}
        disabled={isSaving || isPreviewLoading}
      />
    </div>
  );

  if (isLoading) {
    return <LoadingDataTable />;
  }

  if (error) {
    return <ErrorNotConnectedToApi mutateKey={currentKey} />;
  }

  return (
    <>
      <ConfirmDialog />

      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <div className="text-sm text-slate-500">Pending Requests</div>
          <div className="mt-2 text-3xl font-semibold text-slate-800">
            {requestSummary.pending}
          </div>
        </Card>

        <Card>
          <div className="text-sm text-slate-500">Approved Requests</div>
          <div className="mt-2 text-3xl font-semibold text-green-600">
            {requestSummary.approved}
          </div>
        </Card>

        <Card>
          <div className="text-sm text-slate-500">Rejected Requests</div>
          <div className="mt-2 text-3xl font-semibold text-red-600">
            {requestSummary.rejected}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col gap-5 p-4">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-2xl font-semibold text-slate-800">
                Request Leave
              </div>
              <div className="mt-1 text-sm text-slate-500">
                Submit and manage your own leave requests. Approval is handled from Approval Inbox.
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {hasRole(profileState.role, ['superadmin']) && (
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <Checkbox
                    inputId="showDeletedData"
                    checked={isShowDeletedDataChecked}
                    onChange={() => setIsShowDeletedDataChecked((prev) => !prev)}
                  />
                  <label
                    htmlFor="showDeletedData"
                    className="cursor-pointer text-sm text-slate-700"
                  >
                    Show deleted data
                  </label>
                </div>
              )}

              <IconField iconPosition="left">
                <InputIcon className="pi pi-search" />
                <InputText
                  value={globalFilterValue}
                  onChange={onGlobalFilterChange}
                  placeholder="Search request leave"
                  className="w-full sm:w-64"
                />
              </IconField>

              <Button
                label="New Request"
                icon="pi pi-plus"
                onClick={onClickNew}
              />
            </div>
          </div>

          <DataTable
            value={requestRows}
            stripedRows
            paginator
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            dataKey="id"
            filters={filters}
            globalFilterFields={[
              'leave_name',
              'reason',
              'status',
              'approved_by_name',
            ]}
            emptyMessage="No request leave found."
            currentPageReportTemplate="{first} to {last} of {totalRecords}"
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            loading={isLoading}
            scrollable
            tableStyle={{ minWidth: '110rem' }}
          >
            <Column
              header="#"
              headerStyle={{ width: '3rem' }}
              body={(_, options) => options.rowIndex + 1}
            />

            <Column
              header="Leave Type"
              body={leaveTypeBody}
              style={{ minWidth: '14rem' }}
            />

            <Column
              header="Date Range"
              body={dateRangeBody}
              style={{ minWidth: '18rem' }}
            />

            <Column
              field="total_days"
              header="Days"
              style={{ minWidth: '8rem' }}
            />

            <Column
              field="reason"
              header="Reason"
              style={{ minWidth: '24rem' }}
            />

            <Column
              header="Attachment"
              body={attachmentBody}
              style={{ minWidth: '10rem' }}
            />

            <Column
              header="Status"
              body={statusBody}
              style={{ minWidth: '10rem' }}
            />

            <Column
              field="approved_by_name"
              header="Processed By"
              body={(rowData: RequestLeave) => rowData.approved_by_name || '-'}
              style={{ minWidth: '14rem' }}
            />

            <Column
              header="Processed At"
              body={processedAtBody}
              style={{ minWidth: '14rem' }}
            />

            <Column
              header="Action"
              body={actionColumnBody}
              frozen
              alignFrozen="right"
              style={{ minWidth: '13rem' }}
              headerStyle={{
                minWidth: '13rem',
                background: '#ffffff',
                zIndex: 1,
              }}
              bodyStyle={{
                minWidth: '13rem',
                background: '#ffffff',
              }}
            />
          </DataTable>
        </div>
      </Card>

      <Dialog
        header="Leave Attachments"
        visible={attachmentDialogVisible}
        style={{ width: '95vw', maxWidth: '920px' }}
        breakpoints={{ '960px': '95vw' }}
        onHide={handleAttachmentDialogHide}
        modal
        draggable={false}
        resizable={false}
      >
        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {attachmentRequestLeave ? (
              <>
                <span className="font-semibold">Request:</span>{' '}
                {leaveTypeBody(attachmentRequestLeave)} |{' '}
                {dateRangeBody(attachmentRequestLeave)}
              </>
            ) : (
              'Attachment list'
            )}
          </div>

          <DataTable
            value={attachmentRows}
            loading={attachmentLoading}
            emptyMessage="No attachment found."
            dataKey="id"
            tableStyle={{ minWidth: '55rem' }}
          >
            <Column
              header="#"
              headerStyle={{ width: '3rem' }}
              body={(_, options) => options.rowIndex + 1}
            />

            <Column
              field="original_file_name"
              header="File Name"
              style={{ minWidth: '20rem' }}
            />

            <Column
              field="content_type"
              header="Type"
              style={{ minWidth: '12rem' }}
            />

            <Column
              header="Size"
              body={(rowData: RequestLeaveAttachment) =>
                `${(rowData.file_size / 1024).toFixed(1)} KB`
              }
              style={{ minWidth: '8rem' }}
            />

            <Column
              header="Uploaded At"
              body={(rowData: RequestLeaveAttachment) =>
                dayjs(rowData.created_at).format('DD MMM YYYY HH:mm')
              }
              style={{ minWidth: '14rem' }}
            />

            <Column
              header="Action"
              style={{ minWidth: '12rem' }}
              body={(rowData: RequestLeaveAttachment) => (
                <div className="flex flex-wrap gap-2">
                  <Button
                    tooltipOptions={{ appendTo: getBody, position: 'top' }}
                    tooltip="Preview"
                    rounded
                    severity="info"
                    icon={
                      openingAttachmentId === rowData.id
                        ? 'pi pi-spin pi-spinner'
                        : 'pi pi-eye'
                    }
                    size="small"
                    disabled={openingAttachmentId === rowData.id}
                    onClick={() => previewAttachmentSecurely(rowData)}
                  />

                  <Button
                    tooltipOptions={{ appendTo: getBody, position: 'top' }}
                    tooltip="Download"
                    rounded
                    severity="secondary"
                    icon={
                      downloadingAttachmentId === rowData.id
                        ? 'pi pi-spin pi-spinner'
                        : 'pi pi-download'
                    }
                    size="small"
                    disabled={downloadingAttachmentId === rowData.id}
                    onClick={() => downloadAttachmentSecurely(rowData)}
                  />

                  {attachmentRequestLeave?.status?.toUpperCase() === 'PENDING' && (
                    <Button
                      tooltipOptions={{ appendTo: getBody, position: 'top' }}
                      tooltip="Delete"
                      rounded
                      severity="danger"
                      icon="pi pi-trash"
                      size="small"
                      onClick={() => onClickDeleteAttachment(rowData)}
                    />
                  )}
                </div>
              )}
            />
          </DataTable>

          {previewFileUrl && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-800">
                    {previewFileName}
                  </div>
                  <div className="text-sm text-slate-500">
                    {previewFileContentType}
                  </div>
                </div>

                <Button
                  type="button"
                  label="Close Preview"
                  icon="pi pi-times"
                  className="p-button-text"
                  onClick={clearPreviewFile}
                />
              </div>

              {previewFileContentType.startsWith('image/') ? (
                <div className="flex justify-center rounded-xl bg-white p-3">
                  <img
                    src={previewFileUrl}
                    alt={previewFileName}
                    className="max-h-[70vh] max-w-full rounded-lg object-contain"
                  />
                </div>
              ) : (
                <iframe
                  src={previewFileUrl}
                  title={previewFileName}
                  className="h-[70vh] w-full rounded-xl border border-slate-200 bg-white"
                />
              )}
            </div>
          )}
        </div>
      </Dialog>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Dialog
          header={popupHeaderTitle}
          visible={visible}
          style={{ width: '95vw', maxWidth: '980px' }}
          breakpoints={{ '960px': '95vw' }}
          onHide={handleDialogHide}
          footer={footerContent}
          modal
          draggable={false}
          resizable={false}
        >
          <div className="flex flex-col gap-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-800">
                  Leave Request Detail
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Fill leave type, balance period, date range, reason, and attachment if required.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="leave_type_id"
                    className="text-sm font-medium text-slate-700"
                  >
                    Leave Type
                  </label>
                  <Controller
                    name="leave_type_id"
                    control={control}
                    rules={{
                      required: 'Leave type is required',
                      validate: (value) =>
                        Number(value) > 0 || 'Leave type is required',
                    }}
                    render={({ field, fieldState }) => (
                      <>
                        <Dropdown
                          id="leave_type_id"
                          appendTo={getBody}
                          value={field.value}
                          options={activeLeaveTypes}
                          loading={leaveTypeIsLoading}
                          disabled={leaveTypeIsLoading || !!leaveTypeError || isSaving}
                          onChange={(e) => field.onChange(e.value)}
                          optionLabel="name"
                          optionValue="id"
                          placeholder="Select leave type"
                          className={fieldState.invalid ? 'p-invalid' : ''}
                          filter
                          showClear
                        />
                        {fieldState.error && (
                          <small className="font-bold p-error">
                            {fieldState.error.message}
                          </small>
                        )}
                      </>
                    )}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="employee_leave_balance_id"
                    className="text-sm font-medium text-slate-700"
                  >
                    Leave Balance Period
                  </label>
                  <Controller
                    name="employee_leave_balance_id"
                    control={control}
                    rules={{
                      required: 'Leave balance is required',
                      validate: (value) =>
                        Number(value) > 0 || 'Leave balance is required',
                    }}
                    render={({ field, fieldState }) => (
                      <>
                        <Dropdown
                          id="employee_leave_balance_id"
                          appendTo={getBody}
                          value={field.value}
                          options={availableLeaveBalances.map((item) => ({
                            label: `${dayjs(item.period_start).format('DD MMM YYYY')} - ${dayjs(item.period_end).format('DD MMM YYYY')} | Closing: ${item.closing_balance}`,
                            value: item.id,
                          }))}
                          loading={employeeLeaveBalanceIsLoading}
                          disabled={
                            employeeLeaveBalanceIsLoading ||
                            !!employeeLeaveBalanceError ||
                            isSaving
                          }
                          onChange={(e) => field.onChange(e.value)}
                          placeholder="Select leave balance"
                          className={fieldState.invalid ? 'p-invalid' : ''}
                          filter
                          showClear
                        />
                        {fieldState.error && (
                          <small className="font-bold p-error">
                            {fieldState.error.message}
                          </small>
                        )}
                      </>
                    )}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="start_date"
                    className="text-sm font-medium text-slate-700"
                  >
                    Start Date
                  </label>
                  <Controller
                    name="start_date"
                    control={control}
                    rules={{
                      required: 'Start date is required',
                      validate: (value) => {
                        if (!value || !selectedBalance) {
                          return true;
                        }

                        const selected = dayjs(value);
                        const min = dayjs(selectedBalance.period_start);
                        const max = dayjs(selectedBalance.period_end);

                        if (selected.isBefore(min, 'day') || selected.isAfter(max, 'day')) {
                          return 'Start date must be within selected leave balance period';
                        }

                        return true;
                      },
                    }}
                    render={({ field, fieldState }) => (
                      <>
                        <Calendar
                          id="start_date"
                          appendTo={getBody}
                          value={field.value}
                          onChange={(e) => field.onChange(e.value)}
                          dateFormat="dd/mm/yy"
                          showIcon
                          className={fieldState.invalid ? 'p-invalid' : ''}
                          disabled={isSaving}
                        />
                        {fieldState.error && (
                          <small className="font-bold p-error">
                            {fieldState.error.message}
                          </small>
                        )}
                      </>
                    )}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="end_date"
                    className="text-sm font-medium text-slate-700"
                  >
                    End Date
                  </label>
                  <Controller
                    name="end_date"
                    control={control}
                    rules={{
                      required: 'End date is required',
                      validate: (value) => {
                        const start = watch('start_date');

                        if (!value || !start) {
                          return true;
                        }

                        if (dayjs(value).isBefore(start, 'day')) {
                          return 'End date must be after or equal to start date';
                        }

                        if (selectedBalance) {
                          const selected = dayjs(value);
                          const min = dayjs(selectedBalance.period_start);
                          const max = dayjs(selectedBalance.period_end);

                          if (selected.isBefore(min, 'day') || selected.isAfter(max, 'day')) {
                            return 'End date must be within selected leave balance period';
                          }
                        }

                        return true;
                      },
                    }}
                    render={({ field, fieldState }) => (
                      <>
                        <Calendar
                          id="end_date"
                          appendTo={getBody}
                          value={field.value}
                          onChange={(e) => field.onChange(e.value)}
                          dateFormat="dd/mm/yy"
                          showIcon
                          className={fieldState.invalid ? 'p-invalid' : ''}
                          disabled={isSaving}
                        />
                        {fieldState.error && (
                          <small className="font-bold p-error">
                            {fieldState.error.message}
                          </small>
                        )}
                      </>
                    )}
                  />
                </div>

                <div className="flex flex-col gap-2 md:col-span-2">
                  <label
                    htmlFor="reason"
                    className="text-sm font-medium text-slate-700"
                  >
                    Reason
                  </label>
                  <Controller
                    name="reason"
                    control={control}
                    rules={{
                      validate: (value) => {
                        if (selectedLeaveType?.requires_reason && !value.trim()) {
                          return 'Reason is required';
                        }

                        return true;
                      },
                    }}
                    render={({ field, fieldState }) => (
                      <>
                        <InputTextarea
                          id="reason"
                          {...field}
                          rows={4}
                          placeholder="Enter leave reason"
                          className={fieldState.invalid ? 'p-invalid' : ''}
                          disabled={isSaving}
                        />
                        {fieldState.error && (
                          <small className="font-bold p-error">
                            {fieldState.error.message}
                          </small>
                        )}
                      </>
                    )}
                  />
                </div>

                <div className="flex flex-col gap-2 md:col-span-2">
                  <label
                    htmlFor="attachment_file"
                    className="text-sm font-medium text-slate-700"
                  >
                    Attachment
                  </label>
                  <Controller
                    name="attachment_file"
                    control={control}
                    rules={{
                      validate: (value) => {
                        if (
                          selectedLeaveType?.requires_attachment &&
                          isAddNew &&
                          !value
                        ) {
                          return 'Attachment is required for this leave type';
                        }

                        if (value && value.size > MAX_ATTACHMENT_SIZE) {
                          return 'Maximum file size is 5 MB';
                        }

                        if (value && !allowedAttachmentTypes.includes(value.type)) {
                          return 'Only JPG, PNG, and PDF files are allowed';
                        }

                        return true;
                      },
                    }}
                    render={({ field, fieldState }) => (
                      <>
                        <input
                          id="attachment_file"
                          type="file"
                          accept={allowedAttachmentAccept}
                          disabled={isSaving}
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            field.onChange(file);
                          }}
                        />

                        <small className="text-slate-500">
                          Allowed file: JPG, PNG, PDF. Max size: 5 MB.
                        </small>

                        {selectedData?.attachment_count &&
                          selectedData.attachment_count > 0 ? (
                          <small className="text-green-600">
                            Existing attachment: {selectedData.attachment_count} file(s).
                            Uploading a new file will add another attachment.
                          </small>
                        ) : null}

                        {fieldState.error && (
                          <small className="font-bold p-error">
                            {fieldState.error.message}
                          </small>
                        )}
                      </>
                    )}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-800">
                  Request Summary
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Review the selected balance and automatically calculated leave days before submitting.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm text-slate-500">Requested Days</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-800">
                    {isPreviewLoading ? '...' : totalDays}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Weekend and holiday are excluded by backend.
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm text-slate-500">
                    Selected Balance Closing
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-slate-800">
                    {selectedBalance?.closing_balance ?? 0}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm text-slate-500">Selected Period</div>
                  <div className="mt-2 text-sm font-medium text-slate-800">
                    {selectedBalance
                      ? `${dayjs(selectedBalance.period_start).format('DD MMM YYYY')} - ${dayjs(selectedBalance.period_end).format('DD MMM YYYY')}`
                      : '-'}
                  </div>
                </div>
              </div>

              {selectedBalance && totalDays > selectedBalance.closing_balance && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  Requested days exceed available closing balance for the selected leave balance period.
                </div>
              )}

              {!isPreviewLoading && startDate && endDate && totalDays <= 0 && (
                <div className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
                  Selected date range has no working days after excluding weekend and holiday.
                </div>
              )}

              {selectedLeaveType?.requires_attachment && (
                <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  This leave type requires an attachment before it can be approved.
                </div>
              )}
            </div>
          </div>
        </Dialog>
      </form>
    </>
  );
};

export default RequestLeaveTableData;