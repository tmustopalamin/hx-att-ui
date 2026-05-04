'use client'

import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import useSWR, { mutate } from 'swr';
import { useDispatch, useSelector } from 'react-redux';

import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { FilterMatchMode } from 'primereact/api';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import { InputSwitch } from 'primereact/inputswitch';
import { Tag } from 'primereact/tag';
import { Checkbox, CheckboxChangeEvent } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import { Password } from 'primereact/password';

import { RootState } from '@/store/store';
import { showToast } from '@/store/ToastSlice';
import { fetcher } from '@/app/utils/fetcher';
import { isResponseTypeError, getErrorMessage } from '@/app/utils/error-messages';
import { hasRole } from '@/app/utils/role-utils';
import LoadingDataTable from '@/app/_components/LoadingDataTable';
import ErrorNotConnectedToApi from '@/app/_components/ErrorNotConnectedToApi';

import { ResponseType, ResponseTypeCreateSuccess } from '@/app/types/response-type';
import { User } from '@/app/types/User';
import { Employee } from '@/app/types/employee';
import { Role } from '@/app/types/role';
import {
  createUser,
  updateUser,
  deleteUser,
  purgeUser,
  restoreUser,
} from '@/app/services/user-service';

type UserForm = User & {
  confirm_password: string;
};

const defaultFormValue: UserForm = {
  id: 0,
  employee_id: 0,
  email: '',
  username: '',
  password: '',
  confirm_password: '',
  role: [],
  is_active: true,
  deleted_at: null,
  row_version: 0,
};

const passwordPassThrough = {
  root: {
    style: { width: '100%' },
  },
  iconField: {
    root: {
      style: { width: '100%' },
    },
  },
  input: {
    style: { width: '100%' },
  },
};

const UserTableData = () => {
  const dispatch = useDispatch();
  const profileState = useSelector((state: RootState) => state.profile);

  const [selectedData, setSelectedData] = useState<User | null>(null);
  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const [isAddNew, setIsAddNew] = useState(false);
  const [visible, setVisible] = useState(false);
  const [popupHeaderTitle, setPopupHeaderTitle] = useState('New User');
  const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const currentUserKey = `/api/user?show_all=${isShowDeletedDataChecked}`;
  const allUserKey = `/api/user?show_all=true`;

  const {
    control,
    handleSubmit,
    reset,
    setFocus,
    watch,
    getValues,
  } = useForm<UserForm>({
    defaultValues: defaultFormValue,
    mode: 'onTouched',
  });

  const selectedRoles = watch('role') ?? [];

  const [filters, setFilters] = useState({
    global: { value: '', matchMode: FilterMatchMode.CONTAINS },
  });

  const { data: userData, error, isLoading } = useSWR<User[]>(currentUserKey, fetcher);
  const { data: allUserData } = useSWR<User[]>(allUserKey, fetcher);
  const {
    data: employeeData,
    error: employeeError,
    isLoading: employeeIsLoading,
  } = useSWR<Employee[]>(`/api/employees`, fetcher);
  const {
    data: roleData,
    error: roleError,
    isLoading: roleIsLoading,
  } = useSWR<Role[]>(`/api/roles`, fetcher);

  const activeRole = useMemo(() => {
    return (roleData ?? []).filter((item) => item.is_active && !item.deleted_at);
  }, [roleData]);

  const employeeDataFiltered = useMemo(() => {
    const allEmployees = employeeData ?? [];
    const allUsers = allUserData ?? [];

    if (!allEmployees.length) {
      return [];
    }

    if (!visible) {
      return allEmployees;
    }

    if (isAddNew) {
      const assignedEmployeeIds = allUsers.map((item) => item.employee_id);
      return allEmployees.filter((item) => !assignedEmployeeIds.includes(item.id));
    }

    return allEmployees;
  }, [employeeData, allUserData, visible, isAddNew]);

  const refreshUserData = async () => {
    await Promise.all([
      mutate(currentUserKey),
      mutate(allUserKey),
    ]);
  };

  const handleDialogHide = () => {
    setVisible(false);
    setSelectedData(null);
    setIsAddNew(false);
    reset(defaultFormValue);
  };

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    setFilters({
      global: { value, matchMode: FilterMatchMode.CONTAINS },
    });

    setGlobalFilterValue(value);
  };

  const onClickNew = () => {
    setSelectedData(null);
    setIsAddNew(true);
    setPopupHeaderTitle('New User');
    reset(defaultFormValue);
    setVisible(true);
  };

  const onClickUpdate = (data: User) => {
    setSelectedData(data);
    setIsAddNew(false);
    setPopupHeaderTitle('Update User');

    reset({
      ...data,
      password: '',
      confirm_password: '',
    });

    setVisible(true);
  };

  const buildSubmitPayload = (data: UserForm): User => {
    return {
      ...data,
      password: data.password?.trim() ?? '',
      employee_id: isAddNew ? data.employee_id : selectedData?.employee_id ?? data.employee_id,
    };
  };

  const handleSubmitNew = async (data: UserForm) => {
    try {
      setIsSaving(true);

      const payload = buildSubmitPayload(data);
      const res: ResponseType<ResponseTypeCreateSuccess> = await createUser(payload);

      await refreshUserData();
      handleDialogHide();

      dispatch(
        showToast({
          visible: true,
          severity: 'success',
          summary: 'Success',
          detail: res.message || 'User created successfully.',
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

  const handleUpdate = async (data: UserForm) => {
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

    if (
      selectedData.row_version === null ||
      selectedData.row_version === undefined ||
      Number.isNaN(Number(selectedData.row_version))
    ) {
      dispatch(
        showToast({
          visible: true,
          severity: 'error',
          summary: 'Error',
          detail: 'Row version is missing. Please refresh the page and try again.',
        })
      );
      return;
    }

    try {
      setIsSaving(true);

      const payload: User = {
        ...buildSubmitPayload(data),
        employee_id: selectedData.employee_id,
        row_version: selectedData.row_version,
      };

      const res: ResponseType<ResponseTypeCreateSuccess> = await updateUser(
        selectedData.id,
        selectedData.row_version,
        payload
      );

      await refreshUserData();
      handleDialogHide();

      dispatch(
        showToast({
          visible: true,
          severity: 'success',
          summary: 'Success',
          detail: res.message || 'User updated successfully.',
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

  const handleDelete = async (data: User) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await deleteUser(
        data.id,
        data.row_version
      );

      await refreshUserData();

      dispatch(
        showToast({
          visible: true,
          severity: 'success',
          summary: 'Success',
          detail: res.message || 'User deleted successfully.',
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

  const handlePurge = async (data: User) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await purgeUser(data.id);

      await refreshUserData();

      dispatch(
        showToast({
          visible: true,
          severity: 'success',
          summary: 'Success',
          detail: res.message || 'User deleted permanently.',
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

  const handleRestore = async (data: User) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await restoreUser(
        data.id,
        data.row_version
      );

      await refreshUserData();

      dispatch(
        showToast({
          visible: true,
          severity: 'success',
          summary: 'Success',
          detail: res.message || 'User restored successfully.',
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

  const onSubmit = async (data: UserForm) => {
    if (isSaving) {
      return;
    }

    if (isAddNew) {
      await handleSubmitNew(data);
      return;
    }

    await handleUpdate(data);
  };

  const onClickDelete = (data: User) => {
    confirmDialog({
      message: 'Do you want to delete this user?',
      header: 'Delete Confirmation',
      icon: 'pi pi-info-circle',
      defaultFocus: 'accept',
      accept: () => {
        handleDelete(data);
      },
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

  const onClickRestore = (data: User) => {
    confirmDialog({
      message: 'Do you want to restore this user?',
      header: 'Restore Confirmation',
      icon: 'pi pi-info-circle',
      defaultFocus: 'accept',
      accept: () => {
        handleRestore(data);
      },
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

  const onClickPurge = (data: User) => {
    confirmDialog({
      message: 'Do you want to permanently delete this user?',
      header: 'Delete Forever Confirmation',
      icon: 'pi pi-info-circle',
      defaultFocus: 'accept',
      accept: () => {
        handlePurge(data);
      },
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

  const onRoleChange = (
    e: CheckboxChangeEvent,
    currentValue: string[],
    onChange: (value: string[]) => void
  ) => {
    let nextValue = [...currentValue];

    if (e.checked) {
      if (!nextValue.includes(String(e.value))) {
        nextValue.push(String(e.value));
      }
    } else {
      nextValue = nextValue.filter((item) => item !== String(e.value));
    }

    onChange(nextValue);
  };

  const renderStatusColumn = (rowData: User) => {
    if (rowData.deleted_at) {
      return <Tag value="Deleted" severity="secondary" />;
    }

    return rowData.is_active ? (
      <Tag value="Active" severity="success" />
    ) : (
      <Tag value="Inactive" severity="danger" />
    );
  };

  const renderRoleColumn = (rowData: User) => {
    if (!rowData.role?.length) {
      return <span className="text-sm text-slate-400">No role</span>;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {rowData.role.map((item) => (
          <Tag key={item} value={item} severity="info" />
        ))}
      </div>
    );
  };

  const actionColumnBody = (rowData: User) => {
    const isSelf = profileState.employee_id === rowData.employee_id;
    const canPurge = hasRole(profileState.role, ['superadmin']);

    if (rowData.deleted_at) {
      return (
        <div className="flex gap-2">
          {canPurge && (
            <Button
              tooltipOptions={{ appendTo: () => document.body, position: 'top' }}
              tooltip="restore"
              rounded
              severity="success"
              icon="pi pi-refresh"
              size="small"
              onClick={() => onClickRestore(rowData)}
            />
          )}

          {canPurge && (
            <Button
              tooltipOptions={{ appendTo: () => document.body, position: 'top' }}
              tooltip="delete forever"
              rounded
              severity="secondary"
              icon="pi pi-times"
              size="small"
              disabled={isSelf}
              onClick={() => onClickPurge(rowData)}
            />
          )}
        </div>
      );
    }

    return (
      <div className="flex gap-2">
        <Button
          tooltipOptions={{ appendTo: () => document.body, position: 'top' }}
          tooltip="update"
          rounded
          severity="help"
          icon="pi pi-pencil"
          size="small"
          onClick={() => onClickUpdate(rowData)}
        />

        <Button
          tooltipOptions={{ appendTo: () => document.body, position: 'top' }}
          tooltip="delete"
          rounded
          severity="danger"
          icon="pi pi-trash"
          size="small"
          disabled={isSelf}
          onClick={() => onClickDelete(rowData)}
        />
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
        disabled={isSaving}
      />
      <Button
        type="submit"
        label={
          isSaving
            ? isAddNew
              ? 'Submitting...'
              : 'Saving...'
            : isAddNew
              ? 'Submit'
              : 'Save'
        }
        icon={isSaving ? 'pi pi-spin pi-spinner' : 'pi pi-check'}
        disabled={isSaving}
      />
    </div>
  );

  if (isLoading) {
    return <LoadingDataTable />;
  }

  if (error) {
    return <ErrorNotConnectedToApi mutateKey={currentUserKey} />;
  }

  return (
    <>
      <ConfirmDialog />

      <Card>
        <div className="flex flex-col gap-5 p-4 md:p-5">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-2xl font-semibold text-slate-800">User</div>
              <div className="mt-1 text-sm text-slate-500">
                Manage system user accounts and assign them to employees.
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <div className="flex items-center gap-2">
                <Checkbox
                  inputId="showDeletedData"
                  name="showDeletedData"
                  onChange={() => setIsShowDeletedDataChecked((prev) => !prev)}
                  checked={isShowDeletedDataChecked}
                />
                <label htmlFor="showDeletedData" className="text-sm text-slate-600">
                  Show deleted data
                </label>
              </div>

              <IconField iconPosition="left">
                <InputIcon className="pi pi-search" />
                <InputText
                  className="w-full sm:w-[18rem]"
                  value={globalFilterValue}
                  onChange={onGlobalFilterChange}
                  placeholder="Search employee, username, or email"
                />
              </IconField>

              <Button
                label="New User"
                icon="pi pi-plus"
                onClick={onClickNew}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <DataTable
              value={userData}
              tableStyle={{ minWidth: '78rem' }}
              stripedRows
              paginator
              rows={10}
              rowsPerPageOptions={[10, 25, 50]}
              dataKey="id"
              filters={filters}
              globalFilterFields={['employee_code', 'full_name', 'username', 'email']}
              emptyMessage="No user found."
              currentPageReportTemplate="{first} to {last} of {totalRecords}"
              paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
              loading={isLoading}
              scrollable
              scrollHeight="500px"
            >
              <Column
                header="#"
                headerStyle={{ width: '4rem', minWidth: '4rem' }}
                bodyStyle={{ minWidth: '4rem' }}
                body={(_, options) => options.rowIndex + 1}
              />
              <Column
                field="employee_code"
                header="Employee ID"
                style={{ minWidth: '10rem' }}
              />
              <Column
                field="full_name"
                header="Full Name"
                style={{ minWidth: '16rem' }}
              />
              <Column
                field="username"
                header="Username"
                style={{ minWidth: '12rem' }}
              />
              <Column
                field="email"
                header="Email"
                style={{ minWidth: '16rem' }}
              />
              <Column
                field="role"
                header="Role"
                body={renderRoleColumn}
                style={{ minWidth: '14rem' }}
              />
              <Column
                field="is_active"
                header="Status"
                body={renderStatusColumn}
                style={{ minWidth: '10rem' }}
              />
              <Column
                header="Action"
                body={actionColumnBody}
                frozen
                alignFrozen="right"
                style={{ minWidth: '10rem' }}
                headerStyle={{
                  minWidth: '10rem',
                  background: '#ffffff',
                  zIndex: 1,
                }}
                bodyStyle={{
                  minWidth: '10rem',
                  background: '#ffffff',
                }}
              />
            </DataTable>
          </div>
        </div>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Dialog
          header={popupHeaderTitle}
          visible={visible}
          modal
          draggable={false}
          resizable={false}
          style={{ width: '95vw', maxWidth: '860px' }}
          breakpoints={{ '960px': '95vw' }}
          onHide={handleDialogHide}
          footer={footerContent}
          onShow={() => {
            if (isAddNew) {
              setFocus('employee_id');
            } else {
              setFocus('email');
            }
          }}
        >
          <div className="flex flex-col gap-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-sm font-semibold text-slate-800">
                {isAddNew ? 'Create New User Account' : 'Update User Account'}
              </div>
              <div className="mt-1 text-sm leading-6 text-slate-500">
                {isAddNew
                  ? 'Select an employee, then create login credentials and assign role access.'
                  : 'Employee assignment is locked. You can update login credentials, roles, and account status only.'}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-800">
                  Employee Assignment
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  One employee can only have one user account.
                </p>
              </div>

              <Controller
                name="employee_id"
                control={control}
                rules={{
                  required: 'Employee is required',
                  validate: (value) => Number(value) > 0 || 'Employee is required',
                }}
                render={({ field, fieldState }) => (
                  <div className="flex flex-col gap-2">
                    <label htmlFor="employee_id" className="text-sm font-medium text-slate-700">
                      Employee
                    </label>

                    <Dropdown
                      id="employee_id"
                      appendTo={() => document.body}
                      value={field.value}
                      options={employeeDataFiltered}
                      loading={employeeIsLoading}
                      disabled={!isAddNew || employeeIsLoading || !!employeeError || isSaving}
                      onChange={(e) => field.onChange(e.value)}
                      optionLabel="full_name"
                      optionValue="id"
                      placeholder={
                        employeeIsLoading
                          ? 'Loading employees...'
                          : isAddNew
                            ? 'Select employee'
                            : 'Employee cannot be changed'
                      }
                      className={`w-full ${fieldState.invalid ? 'p-invalid' : ''}`}
                      filter={isAddNew}
                      showClear={isAddNew}
                    />

                    {fieldState.error && (
                      <small className="font-medium text-red-500">
                        {fieldState.error.message}
                      </small>
                    )}

                    {employeeError && (
                      <small className="font-medium text-red-500">
                        We couldn’t load the employee list. Please try again.
                      </small>
                    )}

                    {!isAddNew && (
                      <small className="text-slate-500">
                        Employee assignment cannot be changed after user creation.
                      </small>
                    )}

                    {isAddNew && (
                      <small className="text-slate-500">
                        Only employees without an existing user account are shown.
                      </small>
                    )}
                  </div>
                )}
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-800">
                  Login Information
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Username and email are used for login and account identification.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Controller
                  name="email"
                  control={control}
                  rules={{
                    required: 'Email is required',
                    maxLength: { value: 150, message: 'Maximum 150 characters' },
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Invalid email format',
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col gap-2">
                      <label htmlFor="email" className="text-sm font-medium text-slate-700">
                        Email
                      </label>

                      <InputText
                        id="email"
                        type="email"
                        placeholder="example: hello@gmail.com"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value)}
                        className={fieldState.invalid ? 'p-invalid' : ''}
                        disabled={isSaving}
                      />

                      {fieldState.error && (
                        <small className="font-medium text-red-500">
                          {fieldState.error.message}
                        </small>
                      )}
                    </div>
                  )}
                />

                <Controller
                  name="username"
                  control={control}
                  rules={{
                    required: 'Username is required',
                    maxLength: { value: 100, message: 'Maximum 100 characters' },
                  }}
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col gap-2">
                      <label htmlFor="username" className="text-sm font-medium text-slate-700">
                        Username
                      </label>

                      <InputText
                        id="username"
                        placeholder="example: user.abc"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value)}
                        className={fieldState.invalid ? 'p-invalid' : ''}
                        disabled={isSaving}
                      />

                      {fieldState.error && (
                        <small className="font-medium text-red-500">
                          {fieldState.error.message}
                        </small>
                      )}
                    </div>
                  )}
                />

                <Controller
                  name="password"
                  control={control}
                  rules={{
                    validate: (value) => {
                      const passwordValue = value?.trim() ?? '';

                      if (isAddNew && !passwordValue) {
                        return 'Password is required for new user';
                      }

                      if (passwordValue && passwordValue.length < 8) {
                        return 'Password must be at least 8 characters';
                      }

                      if (passwordValue && passwordValue.length > 50) {
                        return 'Maximum 50 characters';
                      }

                      return true;
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col gap-2">
                      <label htmlFor="password" className="text-sm font-medium text-slate-700">
                        Password
                      </label>

                      <Password
                        id="password"
                        placeholder={
                          isAddNew
                            ? 'Enter password'
                            : 'Leave blank to keep current password'
                        }
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value)}
                        feedback={isAddNew}
                        toggleMask
                        inputClassName="w-full"
                        className={`w-full ${fieldState.invalid ? 'p-invalid' : ''}`}
                        disabled={isSaving}
                        pt={passwordPassThrough}
                      />

                      {fieldState.error && (
                        <small className="font-medium text-red-500">
                          {fieldState.error.message}
                        </small>
                      )}

                      {!isAddNew && !fieldState.error && (
                        <small className="text-slate-500">
                          Leave password blank if you do not want to change it.
                        </small>
                      )}
                    </div>
                  )}
                />

                <Controller
                  name="confirm_password"
                  control={control}
                  rules={{
                    validate: (value) => {
                      const passwordValue = getValues('password')?.trim() ?? '';
                      const confirmValue = value?.trim() ?? '';

                      if (isAddNew && !confirmValue) {
                        return 'Confirm password is required for new user';
                      }

                      if (!isAddNew && passwordValue && !confirmValue) {
                        return 'Confirm password is required when changing password';
                      }

                      if (passwordValue && confirmValue !== passwordValue) {
                        return 'Password and confirm password must be the same';
                      }

                      return true;
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col gap-2">
                      <label htmlFor="confirm_password" className="text-sm font-medium text-slate-700">
                        Confirm Password
                      </label>

                      <Password
                        id="confirm_password"
                        placeholder={
                          isAddNew
                            ? 'Retype password'
                            : 'Retype new password'
                        }
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value)}
                        feedback={false}
                        toggleMask
                        inputClassName="w-full"
                        className={`w-full ${fieldState.invalid ? 'p-invalid' : ''}`}
                        disabled={isSaving}
                        pt={passwordPassThrough}
                      />

                      {fieldState.error && (
                        <small className="font-medium text-red-500">
                          {fieldState.error.message}
                        </small>
                      )}

                      {!isAddNew && !fieldState.error && (
                        <small className="text-slate-500">
                          Required only if you fill the password field.
                        </small>
                      )}
                    </div>
                  )}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-800">
                  Role Access
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Assign one or more roles to determine what this user can access.
                </p>
              </div>

              <Controller
                name="role"
                control={control}
                rules={{
                  validate: (value) =>
                    value && value.length > 0 ? true : 'Role is required',
                }}
                render={({ field, fieldState }) => (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                      {roleIsLoading && (
                        <small className="text-slate-500">Loading roles...</small>
                      )}

                      {!roleIsLoading && activeRole.length === 0 && (
                        <small className="text-slate-500">No active role found.</small>
                      )}

                      {!roleIsLoading &&
                        activeRole.map((role: Role) => {
                          const checked = (field.value ?? []).some(
                            (item: string) => item === role.code.toString()
                          );

                          return (
                            <div
                              key={role.code}
                              className={`rounded-xl border bg-white p-3 transition ${checked
                                ? 'border-blue-300 ring-1 ring-blue-200'
                                : 'border-slate-200'
                                }`}
                            >
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  inputId={role.code.toString()}
                                  name="role"
                                  value={role.code}
                                  onChange={(e) =>
                                    onRoleChange(e, field.value ?? [], field.onChange)
                                  }
                                  checked={checked}
                                  disabled={isSaving}
                                />

                                <label
                                  htmlFor={role.code.toString()}
                                  className="cursor-pointer"
                                >
                                  <div className="text-sm font-semibold text-slate-800">
                                    {role.name || role.code}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    {role.description || role.code}
                                  </div>
                                  <div className="mt-2">
                                    <Tag value={role.code} severity="info" />
                                  </div>
                                </label>
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    {!!selectedRoles.length && (
                      <div className="flex flex-wrap gap-2">
                        {selectedRoles.map((item) => (
                          <Tag key={item} value={item} severity="info" />
                        ))}
                      </div>
                    )}

                    {fieldState.error && (
                      <small className="font-medium text-red-500">
                        {fieldState.error.message}
                      </small>
                    )}

                    {roleError && (
                      <small className="font-medium text-red-500">
                        We couldn’t load the role list. Please try again.
                      </small>
                    )}
                  </div>
                )}
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-800">
                  Account Status
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Inactive users cannot use the system.
                </p>
              </div>

              <Controller
                name="is_active"
                control={control}
                defaultValue={true}
                render={({ field }) => (
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-slate-800">
                        {field.value ? 'Account is active' : 'Account is inactive'}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {field.value
                          ? 'This user can login and access permitted menus.'
                          : 'This user cannot login until reactivated.'}
                      </div>
                    </div>

                    <InputSwitch
                      id="is_active"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.value)}
                      disabled={isSaving}
                    />
                  </div>
                )}
              />
            </div>
          </div>
        </Dialog>
      </form>
    </>
  );
};

export default UserTableData;