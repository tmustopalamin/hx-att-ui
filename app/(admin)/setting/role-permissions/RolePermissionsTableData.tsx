'use client'

import { Card } from 'primereact/card'
import { Button } from 'primereact/button';
import { Controller, useForm } from 'react-hook-form';
import CardTitle from '@/app/_components/CardTitle';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import { useEffect, useState } from 'react';
import useSWR, { mutate } from 'swr';
import { fetcher } from '@/app/utils/fetcher';
import { ResponseType, ResponseTypeCreateSuccess } from '@/app/types/response-type';
import LoadingDataTable from '@/app/_components/LoadingDataTable';
import ErrorNotConnectedToApi from '@/app/_components/ErrorNotConnectedToApi';
import { isResponseTypeError, getErrorMessage } from '@/app/utils/error-messages';
import { showToast } from '@/store/ToastSlice';
import { useDispatch, useSelector } from 'react-redux';
import { Checkbox } from 'primereact/checkbox';
import { RootState } from '@/store/store';
import { Role } from '@/app/types/role';
import { Permissions } from '@/app/types/permissions';
import { saveRolePermissions } from '@/app/services/role-service';
import { Dropdown } from 'primereact/dropdown';
import { RolePermissions } from '@/app/types/role-permissions';

type PermissionGroup = {
  group: string
  group_name: string
  permissions: {
    id: number
    code: string
    label: string
  }[]
}

const RolePermissionsTableData = () => {
  const dispatch = useDispatch();
  const profileState = useSelector((state: RootState) => state.profile);
  const [selectedData, setSelectedData] = useState<RolePermissions | null>(null);
  const [isAddNew, setIsAddNew] = useState(false);
  const [visible, setVisible] = useState(false);
  const [popupHeaderTitle, setPopupHeaderTitle] = useState('');
  const { control, watch, formState: { isValid }, reset, clearErrors, handleSubmit, setValue } = useForm<RolePermissions>({
    defaultValues: {
      role_id: 0,
      permissions: []
    }
  });

  const onSave = async (data: RolePermissions) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await saveRolePermissions(data.role_id, data)
      // mutate(`/api/income-component`);
      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
      reset();
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  };

  const { data, error, isLoading } = useSWR<Role[]>(`/api/roles`, fetcher);
  const { data: dataPermissions, error: errorPermissions, isLoading: isLoadingPermissions } = useSWR<Permissions[]>(`/api/permissions`, fetcher);
  const { data: dataRolePermissions, error: errRolePermissions, isLoading: isLoadingRolePermissions } = useSWR<RolePermissions[]>(watch('role_id') ? `/api/roles/${watch('role_id')}/permissions` : null, fetcher);

  useEffect(() => {
    if (!dataRolePermissions || dataRolePermissions.length === 0) return

    const permissions = dataRolePermissions.map(p => String(p.permissions))

    console.log(dataRolePermissions, permissions, 'lalal')

    setValue('permissions', permissions, {
      // shouldDirty: false,
      // shouldTouch: false,
      // shouldValidate: false,
    })
  }, [dataRolePermissions, setValue])


  const groupingPermission = (data: Permissions[]) => {
    const map: Record<string, PermissionGroup> = {}
    data.forEach(p => {

      if (!map[p.resource]) {
        map[p.resource] = {
          group: p.resource,
          group_name: p.group_name,
          permissions: []
        }
      }

      map[p.resource].permissions.push({
        id: p.id,
        code: p.code,
        label: p.label
      })
    })

    return Object.values(map)
  }

  const dataPermissionsGroupped = groupingPermission(dataPermissions ? dataPermissions : []);

  if (isLoading) return <LoadingDataTable />;
  if (error) {
    return <ErrorNotConnectedToApi mutateKey='/api/roles' />
  }

  const onSubmit = (data: RolePermissions) => {
    if (!isValid)
      return;

    if (isAddNew) {
      // handleSubmitNew(data);
      return;
    }

    // if (selectedData) {
    //   handleUpdate(data);
    // }
  };

  const onClickUpdate = (data: RolePermissions) => {
    setVisible(true);
    setIsAddNew(false);
    setPopupHeaderTitle('Update Role');

    reset(data)
    setSelectedData(data);
  }

  return (
    <>
      <ConfirmDialog />
      <Card title={<CardTitle title='Role Permission' url='' />}>

        <form onSubmit={handleSubmit(onSave)}>
          <div className="p-3 flex flex-col gap-5">

            <div className="m-0 flex flex-col gap-2">
              <label htmlFor="role">Role</label>
              <Controller
                name="role_id"
                rules={{ required: "*required" }}
                control={control}
                render={({ field, fieldState }) => (
                  <>
                    <Dropdown
                      id="role_id"
                      appendTo={() => document.body}
                      value={field.value}
                      options={data}
                      loading={isLoading}
                      onChange={(e) => {
                        field.onChange(e.value ?? null);
                      }}
                      optionLabel="name"
                      optionValue="id"
                      showClear={true}
                      placeholder={
                        isLoading ? "Loading roles..." : "Select a role"
                      }
                      className={fieldState.invalid ? "p-invalid" : ""}
                    />
                    {fieldState.error && <small className="font-bold">{fieldState.error.message}</small>}
                    {error && (<small className="p-error font-bold">We couldn’t load the list of roles. Please try again</small>)}
                  </>
                )}
              />
            </div>

            {watch('role_id') > 0 && dataPermissionsGroupped.map(group => (
              <div key={group.group} className="border rounded-lg p-4">
                <div className="flex items-center mb-3 gap-2">
                  <h2 className="font-semibold text-gray-700">
                    {group.group_name}
                  </h2>
                  <div className="flex items-center">
                    <Controller
                      name="permissions"
                      control={control}
                      render={({ field }) => {
                        const value = field.value ?? []

                        // semua permission code di group ini
                        const groupCodes = group.permissions.map(p => String(p.code))

                        // apakah semua permission group sudah tercentang
                        const isAllChecked = groupCodes.every(code =>
                          value.includes(String(code))
                        )

                        return (
                          <div className="flex items-center gap-2">
                            <Checkbox
                              inputId={group.group}
                              checked={isAllChecked}
                              onChange={(e) => {
                                if (e.checked) {
                                  const merged = Array.from(
                                    new Set([...value, ...groupCodes])
                                  )
                                  field.onChange(merged)
                                } else {
                                  field.onChange(
                                    value.filter(code => !groupCodes.includes(String(code)))
                                  )
                                }
                              }}
                            />
                            <label htmlFor={group.group} className="font-medium">
                              Select All
                            </label>
                          </div>
                        )
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {group.permissions.map(p => (
                    <Controller
                      key={String(p.id)}
                      name="permissions"
                      control={control}
                      render={({ field }) => {
                        const value = field.value ?? []
                        const checked = value.includes(String(p.id))
                        return (
                          <div className="flex items-center">
                            <Checkbox
                              inputId={String(p.id)}
                              checked={checked}
                              onChange={(e) => {
                                if (e.checked) {
                                  field.onChange([...field.value, String(p.id)])
                                } else {
                                  field.onChange(
                                    field.value.filter(v => v !== String(p.id))
                                  )
                                }
                              }}
                            />
                            <label htmlFor={String(p.id)} className="ml-2">
                              {p.label}
                            </label>
                          </div>
                        )
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}

            {watch('role_id') > 0 && (
              <div className="flex justify-end">
                <Button label="Save" icon="pi pi-check" size="small" type='submit' />
              </div>
            )}

            {watch('role_id') === 0 && (
              <h3>please select a role</h3>
            )}
          </div>
        </form>
      </Card >
    </>
  )
}

export default RolePermissionsTableData