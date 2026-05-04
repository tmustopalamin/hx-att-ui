"use client";

import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import useSWR, { mutate } from "swr";
import { useDispatch } from "react-redux";

import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Dropdown } from "primereact/dropdown";

import { fetcher } from "@/app/utils/fetcher";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import { isResponseTypeError, getErrorMessage } from "@/app/utils/error-messages";
import { showToast } from "@/store/ToastSlice";

import { ResponseType, ResponseTypeCreateSuccess } from "@/app/types/response-type";
import { Role } from "@/app/types/role";
import { Permissions } from "@/app/types/permissions";
import { RolePermissions } from "@/app/types/role-permissions";
import { saveRolePermissions } from "@/app/services/role-service";

type PermissionGroup = {
  group: string;
  group_name: string;
  permissions: {
    code: string;
    label: string;
  }[];
};

type RolePermissionsResponse = {
  role_id: number;
  code: string;
};

const getBody = () => document.body;

const RolePermissionsTableData = () => {
  const dispatch = useDispatch();

  const {
    control,
    watch,
    handleSubmit,
    setValue,
    reset,
    formState: { isValid },
  } = useForm<RolePermissions>({
    defaultValues: {
      role_id: "",
      permissions: [],
    },
    mode: "onTouched",
  });

  const selectedRoleCode = watch("role_id");

  const {
    data: roleData,
    error: roleError,
    isLoading: roleIsLoading,
  } = useSWR<Role[]>("/api/roles", fetcher);

  const {
    data: permissionData,
    error: permissionError,
    isLoading: permissionIsLoading,
  } = useSWR<Permissions[]>("/api/permissions", fetcher);

  const {
    data: rolePermissionData,
    error: rolePermissionError,
    isLoading: rolePermissionIsLoading,
  } = useSWR<RolePermissionsResponse[]>(
    selectedRoleCode ? `/api/roles/${selectedRoleCode}/permissions` : null,
    fetcher
  );

  const activeRoles = useMemo(() => {
    return (roleData ?? []).filter((role) => role.is_active && !role.deleted_at);
  }, [roleData]);

  const activePermissions = useMemo(() => {
    return (permissionData ?? []).filter(
      (permission) => permission.is_active && !permission.deleted_at
    );
  }, [permissionData]);

  const groupedPermissions = useMemo(() => {
    const map: Record<string, PermissionGroup> = {};

    activePermissions.forEach((permission) => {
      if (!map[permission.resource]) {
        map[permission.resource] = {
          group: permission.resource,
          group_name: permission.group_name || permission.resource,
          permissions: [],
        };
      }

      map[permission.resource].permissions.push({
        code: permission.code,
        label: permission.label,
      });
    });

    return Object.values(map).sort((a, b) =>
      a.group_name.localeCompare(b.group_name)
    );
  }, [activePermissions]);

  useEffect(() => {
    if (!selectedRoleCode) {
      setValue("permissions", []);
      return;
    }

    if (!rolePermissionData) {
      return;
    }

    const permissions = rolePermissionData.map((item) => item.code);
    setValue("permissions", permissions, {
      shouldDirty: false,
      shouldValidate: true,
    });
  }, [selectedRoleCode, rolePermissionData, setValue]);

  const onSave = async (data: RolePermissions) => {
    if (!isValid) {
      return;
    }

    if (!data.role_id) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Error",
          detail: "Please select a role first.",
        })
      );
      return;
    }

    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await saveRolePermissions({
          role_id: data.role_id,
          permissions: data.permissions ?? [],
        });

      await mutate(`/api/roles/${data.role_id}/permissions`);

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res.message || "Role permissions updated successfully.",
        })
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: getErrorMessage(err, "message"),
          })
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: err.message,
          })
        );
      }
    }
  };

  if (roleIsLoading) {
    return <LoadingDataTable />;
  }

  if (roleError) {
    return <ErrorNotConnectedToApi mutateKey="/api/roles" />;
  }

  return (
    <Card>
      <div className="flex flex-col gap-5 p-4">
        <div className="flex flex-col gap-3 border-b pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-2xl font-semibold text-slate-800">
              Role Permission
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Assign permissions to roles. This will update role_permissions and
              sync Casbin policies.
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSave)}>
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="role_id"
                className="text-sm font-medium text-slate-700"
              >
                Role
              </label>

              <Controller
                name="role_id"
                control={control}
                rules={{ required: "Role is required" }}
                render={({ field, fieldState }) => (
                  <>
                    <Dropdown
                      id="role_id"
                      appendTo={getBody}
                      value={field.value}
                      options={activeRoles}
                      loading={roleIsLoading}
                      onChange={(e) => {
                        const roleCode = e.value || "";

                        reset({
                          role_id: roleCode,
                          permissions: [],
                        });

                        field.onChange(roleCode);
                      }}
                      optionLabel="name"
                      optionValue="code"
                      placeholder={
                        roleIsLoading ? "Loading roles..." : "Select a role"
                      }
                      className={`w-full md:w-96 ${fieldState.invalid ? "p-invalid" : ""
                        }`}
                      filter
                      showClear
                    />

                    {fieldState.error && (
                      <small className="p-error">
                        {fieldState.error.message}
                      </small>
                    )}
                  </>
                )}
              />
            </div>

            {!selectedRoleCode && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Please select a role first.
              </div>
            )}

            {selectedRoleCode && permissionIsLoading && <LoadingDataTable />}

            {selectedRoleCode && permissionError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                Failed to load permissions. Please refresh and try again.
              </div>
            )}

            {selectedRoleCode && rolePermissionError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                Failed to load selected role permissions. Please refresh and try
                again.
              </div>
            )}

            {selectedRoleCode && rolePermissionIsLoading && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                Loading selected role permissions...
              </div>
            )}

            {selectedRoleCode &&
              !permissionIsLoading &&
              groupedPermissions.length === 0 && (
                <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
                  No active permissions found.
                </div>
              )}

            {selectedRoleCode &&
              groupedPermissions.map((group) => (
                <div
                  key={group.group}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="font-semibold text-slate-800">
                        {String(group.group_name).toUpperCase()}
                      </h2>
                      <p className="text-xs text-slate-500">
                        Resource: {group.group}
                      </p>
                    </div>

                    <Controller
                      name="permissions"
                      control={control}
                      render={({ field }) => {
                        const value = field.value ?? [];
                        const groupCodes = group.permissions.map(
                          (permission) => permission.code
                        );

                        const isAllChecked =
                          groupCodes.length > 0 &&
                          groupCodes.every((code) => value.includes(code));

                        return (
                          <div className="flex items-center gap-2">
                            <Checkbox
                              inputId={`select_all_${group.group}`}
                              checked={isAllChecked}
                              onChange={(e) => {
                                if (e.checked) {
                                  const merged = Array.from(
                                    new Set([...value, ...groupCodes])
                                  );
                                  field.onChange(merged);
                                } else {
                                  field.onChange(
                                    value.filter(
                                      (code) => !groupCodes.includes(code)
                                    )
                                  );
                                }
                              }}
                            />
                            <label
                              htmlFor={`select_all_${group.group}`}
                              className="cursor-pointer text-sm font-medium text-slate-700"
                            >
                              Select All
                            </label>
                          </div>
                        );
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {group.permissions.map((permission) => (
                      <Controller
                        key={permission.code}
                        name="permissions"
                        control={control}
                        render={({ field }) => {
                          const value = field.value ?? [];
                          const checked = value.includes(permission.code);

                          return (
                            <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                              <Checkbox
                                inputId={permission.code}
                                checked={checked}
                                onChange={(e) => {
                                  if (e.checked) {
                                    field.onChange([
                                      ...value,
                                      permission.code,
                                    ]);
                                  } else {
                                    field.onChange(
                                      value.filter(
                                        (code) => code !== permission.code
                                      )
                                    );
                                  }
                                }}
                              />
                              <label
                                htmlFor={permission.code}
                                className="cursor-pointer text-sm text-slate-700"
                              >
                                {permission.label}
                              </label>
                            </div>
                          );
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}

            {selectedRoleCode && (
              <div className="flex justify-end">
                <Button
                  label="Save"
                  icon={
                    rolePermissionIsLoading
                      ? "pi pi-spin pi-spinner"
                      : "pi pi-check"
                  }
                  size="small"
                  type="submit"
                  disabled={rolePermissionIsLoading}
                />
              </div>
            )}
          </div>
        </form>
      </div>
    </Card>
  );
};

export default RolePermissionsTableData;