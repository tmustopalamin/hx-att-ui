"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import useSWR from "swr";

import { Button } from "primereact/button";
import { Card } from "primereact/card";
import IndeterminateCheckbox from "@/app/_components/IndeterminateCheckbox";
import { Dropdown } from "primereact/dropdown";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";

import { useDispatch, useSelector } from "react-redux";

import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";

import { saveRolePermissions } from "@/app/services/role-service";

import { Permissions } from "@/app/types/permissions";
import {
  ResponseType,
  ResponseTypeCreateSuccess,
} from "@/app/types/response-type";
import { RolePermissions } from "@/app/types/role-permissions";
import { Role } from "@/app/types/role";

import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { fetcher } from "@/app/utils/fetcher";

import { showToast } from "@/store/ToastSlice";
import { RootState } from "@/store/store";

type PermissionItem = {
  code: string;
  label: string;
  unavailable: boolean;
};

type PermissionGroup = {
  group: string;
  group_name: string;
  permissions: PermissionItem[];
};

type RolePermissionsResponse = {
  role_id: number;
  code: string;
};

type RoleOption = Role & {
  option_value: string;
};

const getBody = () => document.body;

const normalizeId = (value: string) => {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
};

const RolePermissionsTableData = () => {
  const dispatch = useDispatch();
  const canUpdateRolePermissions = useSelector((state: RootState) =>
    state.profile.permissions.includes("role-permission.update"),
  );

  const [permissionSearchValue, setPermissionSearchValue] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  const roleKey = "/api/roles?show_all=false";

  const permissionKey = "/api/permissions?show_all=false";

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { isDirty },
  } = useForm<RolePermissions>({
    defaultValues: {
      role_id: "",
      permissions: [],
    },
    mode: "onTouched",
  });

  const selectedRoleCode =
    useWatch({
      control,
      name: "role_id",
    }) ?? "";

  const selectedPermissions =
    useWatch({
      control,
      name: "permissions",
    }) ?? [];

  const rolePermissionKey = selectedRoleCode
    ? `/api/roles/${selectedRoleCode}/permissions`
    : null;

  const {
    data: roleData,
    error: roleError,
    isLoading: roleIsLoading,
    isValidating: roleIsValidating,
    mutate: refreshRoleData,
  } = useSWR<Role[]>(roleKey, fetcher);

  const {
    data: permissionData,
    error: permissionError,
    isLoading: permissionIsLoading,
    isValidating: permissionIsValidating,
    mutate: refreshPermissionData,
  } = useSWR<Permissions[]>(permissionKey, fetcher);

  const {
    data: rolePermissionData,
    error: rolePermissionError,
    isLoading: rolePermissionIsLoading,
    isValidating: rolePermissionIsValidating,
    mutate: refreshRolePermissionData,
  } = useSWR<RolePermissionsResponse[]>(rolePermissionKey, fetcher);

  const roleOptions = useMemo<RoleOption[]>(() => {
    return (roleData ?? [])
      .filter((role) => role.is_active && !role.deleted_at)
      .map((role) => ({
        ...role,
        option_value: String(role.code),
      }))
      .sort((first, second) => first.name.localeCompare(second.name));
  }, [roleData]);

  const selectedRole = useMemo(() => {
    return roleOptions.find(
      (role) => role.option_value === String(selectedRoleCode),
    );
  }, [roleOptions, selectedRoleCode]);

  const assignedPermissionCodes = useMemo(() => {
    return (rolePermissionData ?? [])
      .map((item) => String(item.code).trim())
      .filter(Boolean);
  }, [rolePermissionData]);

  const groupedPermissions = useMemo<PermissionGroup[]>(() => {
    const permissions = permissionData ?? [];

    const permissionMap = new Map(
      permissions.map((permission) => [String(permission.code), permission]),
    );

    const assignedCodeSet = new Set(assignedPermissionCodes);

    const visiblePermissions: {
      code: string;
      label: string;
      resource: string;
      group_name: string;
      unavailable: boolean;
    }[] = [];

    for (const permission of permissions) {
      const code = String(permission.code);

      const isAvailable = permission.is_active && !permission.deleted_at;

      const isAssigned = assignedCodeSet.has(code);

      if (!isAvailable && !isAssigned) {
        continue;
      }

      visiblePermissions.push({
        code,
        label: permission.label || code,
        resource: permission.resource || "other",
        group_name:
          permission.group_name || permission.resource || "Other Permissions",
        unavailable: !isAvailable,
      });
    }

    /*
     * Permission yang masih terpasang
     * pada role tetapi sudah tidak
     * dikembalikan endpoint permissions
     * tetap ditampilkan agar tidak
     * terhapus diam-diam saat Save.
     */
    for (const code of assignedPermissionCodes) {
      const alreadyIncluded = visiblePermissions.some(
        (permission) => permission.code === code,
      );

      if (alreadyIncluded) {
        continue;
      }

      const source = permissionMap.get(code);

      visiblePermissions.push({
        code,
        label: source?.label || code,
        resource: source?.resource || "__unavailable__",
        group_name: source?.group_name || "Unavailable Permissions",
        unavailable: true,
      });
    }

    const groupMap = new Map<string, PermissionGroup>();

    for (const permission of visiblePermissions) {
      const currentGroup = groupMap.get(permission.resource);

      if (currentGroup) {
        currentGroup.permissions.push({
          code: permission.code,
          label: permission.label,
          unavailable: permission.unavailable,
        });

        continue;
      }

      groupMap.set(permission.resource, {
        group: permission.resource,
        group_name: permission.group_name,
        permissions: [
          {
            code: permission.code,
            label: permission.label,
            unavailable: permission.unavailable,
          },
        ],
      });
    }

    return Array.from(groupMap.values())
      .map((group) => ({
        ...group,
        permissions: [...group.permissions].sort((first, second) =>
          first.label.localeCompare(second.label),
        ),
      }))
      .sort((first, second) =>
        first.group_name.localeCompare(second.group_name),
      );
  }, [permissionData, assignedPermissionCodes]);

  const filteredPermissionGroups = useMemo(() => {
    const query = permissionSearchValue.trim().toLowerCase();

    if (!query) {
      return groupedPermissions;
    }

    return groupedPermissions
      .map((group) => {
        const groupMatches =
          group.group.toLowerCase().includes(query) ||
          group.group_name.toLowerCase().includes(query);

        const permissions = groupMatches
          ? group.permissions
          : group.permissions.filter(
              (permission) =>
                permission.code.toLowerCase().includes(query) ||
                permission.label.toLowerCase().includes(query),
            );

        return {
          ...group,
          permissions,
        };
      })
      .filter((group) => group.permissions.length > 0);
  }, [groupedPermissions, permissionSearchValue]);

  const totalPermissionCount = useMemo(() => {
    return groupedPermissions.reduce(
      (total, group) => total + group.permissions.length,
      0,
    );
  }, [groupedPermissions]);

  const unavailablePermissionCount = useMemo(() => {
    return groupedPermissions.reduce(
      (total, group) =>
        total +
        group.permissions.filter((permission) => permission.unavailable).length,
      0,
    );
  }, [groupedPermissions]);

  const selectablePermissionCodes = useMemo(() => {
    return groupedPermissions.flatMap((group) =>
      group.permissions
        .filter((permission) => !permission.unavailable)
        .map((permission) => permission.code),
    );
  }, [groupedPermissions]);

  const selectedSelectablePermissionCount = useMemo(() => {
    const selectedCodeSet = new Set(selectedPermissions);

    return selectablePermissionCodes.filter((code) => selectedCodeSet.has(code))
      .length;
  }, [selectablePermissionCodes, selectedPermissions]);

  const allSelectablePermissionsSelected =
    selectablePermissionCodes.length > 0 &&
    selectedSelectablePermissionCount === selectablePermissionCodes.length;

  useEffect(() => {
    if (!selectedRoleCode) {
      setValue("permissions", [], {
        shouldDirty: false,
        shouldValidate: false,
      });

      return;
    }

    if (rolePermissionIsLoading || !rolePermissionData || isDirty) {
      return;
    }

    setValue("permissions", assignedPermissionCodes, {
      shouldDirty: false,
      shouldValidate: false,
    });
  }, [
    selectedRoleCode,
    rolePermissionData,
    assignedPermissionCodes,
    rolePermissionIsLoading,
    isDirty,
    setValue,
  ]);

  const showSuccess = (message: string) => {
    dispatch(
      showToast({
        visible: true,
        severity: "success",
        summary: "Success",
        detail: message,
      }),
    );
  };

  const showError = (err: unknown) => {
    if (isResponseTypeError(err)) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Error",
          detail: getErrorMessage(err, "message"),
        }),
      );

      return;
    }

    if (err instanceof Error) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Error",
          detail: err.message,
        }),
      );

      return;
    }

    dispatch(
      showToast({
        visible: true,
        severity: "error",
        summary: "Error",
        detail: "An unexpected error occurred.",
      }),
    );
  };

  const handleRefresh = async () => {
    try {
      const requests: Promise<unknown>[] = [
        refreshRoleData(),
        refreshPermissionData(),
      ];

      if (selectedRoleCode) {
        requests.push(refreshRolePermissionData());
      }

      await Promise.all(requests);
    } catch (err: unknown) {
      showError(err);
    }
  };

  const onPermissionSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPermissionSearchValue(event.target.value);
  };

  const onRoleChange = (roleCode: string) => {
    reset({
      role_id: roleCode,
      permissions: [],
    });

    setPermissionSearchValue("");
  };

  const handleSelectAllPermissions = () => {
    setValue("permissions", selectablePermissionCodes, {
      shouldDirty: true,
      shouldValidate: false,
    });
  };

  const handleUnselectAllPermissions = () => {
    setValue("permissions", [], {
      shouldDirty: true,
      shouldValidate: false,
    });
  };

  const onSave = async (data: RolePermissions) => {
    if (!canUpdateRolePermissions) {
      showError(
        new Error("You do not have permission to update role permissions."),
      );
      return;
    }
    if (isSaving) {
      return;
    }

    const roleCode = String(data.role_id ?? "").trim();

    if (!roleCode) {
      showError(new Error("Select a role before saving permissions."));

      return;
    }

    if (rolePermissionIsLoading || rolePermissionError) {
      showError(
        new Error(
          "Role permissions are not ready. Refresh the data and try again.",
        ),
      );

      return;
    }

    const permissions = Array.from(
      new Set(
        (data.permissions ?? [])
          .map((code) => String(code).trim())
          .filter(Boolean),
      ),
    );

    try {
      setIsSaving(true);

      const response: ResponseType<ResponseTypeCreateSuccess> =
        await saveRolePermissions({
          role_id: roleCode,
          permissions,
        });

      reset({
        role_id: roleCode,
        permissions,
      });

      await refreshRolePermissionData();

      showSuccess(response.message || "Role permissions updated successfully.");
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const roleOptionTemplate = (role: RoleOption) => {
    return (
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium text-slate-800">
          {role.name}
        </span>

        <span className="font-mono text-xs text-slate-500">
          {role.option_value}
        </span>
      </div>
    );
  };

  const selectedRoleTemplate = (role: RoleOption | null) => {
    if (!role) {
      return <span className="text-slate-400">Select role</span>;
    }

    return roleOptionTemplate(role);
  };

  const allDataValidating =
    roleIsValidating ||
    permissionIsValidating ||
    Boolean(selectedRoleCode && rolePermissionIsValidating);

  const permissionSelectionDisabled =
    !canUpdateRolePermissions ||
    isSaving ||
    rolePermissionIsLoading ||
    Boolean(rolePermissionError);

  if (roleIsLoading || permissionIsLoading) {
    return <LoadingDataTable />;
  }

  if (roleError) {
    return <ErrorNotConnectedToApi mutateKey={roleKey} />;
  }

  if (permissionError) {
    return <ErrorNotConnectedToApi mutateKey={permissionKey} />;
  }

  return (
    <>
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
          {/* Page Header */}
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:flex">
                <i className="pi pi-lock-open text-xl" />
              </div>

              <div className="min-w-0">
                <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
                  Role Permissions
                </h1>

                <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                  Assign permissions to roles and synchronize role access with
                  Casbin authorization policies.
                </p>
              </div>
            </div>

            <Button
              type="button"
              label="Refresh"
              icon="pi pi-refresh"
              severity="secondary"
              outlined
              size="small"
              loading={allDataValidating}
              disabled={allDataValidating || isSaving}
              className="w-full sm:w-auto"
              onClick={handleRefresh}
            />
          </div>

          <form
            id="role-permissions-form"
            onSubmit={handleSubmit(onSave)}
            className="flex flex-col gap-5"
          >
            {/* Role Selection */}
            <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
              <div>
                <h2 className="m-0 text-sm font-semibold text-slate-800">
                  Select Role
                </h2>

                <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                  Choose the role whose permissions will be reviewed or changed.
                </p>
              </div>

              <Controller
                name="role_id"
                control={control}
                rules={{
                  required: "Role is required.",
                }}
                render={({ field, fieldState }) => (
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="role_id"
                      className="text-sm font-medium text-slate-700"
                    >
                      Role
                      <span className="ml-1 text-red-500">*</span>
                    </label>

                    <Dropdown
                      id="role_id"
                      appendTo={getBody}
                      value={field.value || null}
                      options={roleOptions}
                      optionLabel="name"
                      optionValue="option_value"
                      itemTemplate={roleOptionTemplate}
                      valueTemplate={selectedRoleTemplate}
                      filter
                      showClear
                      disabled={isSaving || roleOptions.length === 0}
                      placeholder="Select role"
                      className={`w-full md:max-w-md ${
                        fieldState.invalid ? "p-invalid" : ""
                      }`}
                      onChange={(event) =>
                        onRoleChange(event.value ? String(event.value) : "")
                      }
                    />

                    {fieldState.error && (
                      <small className="p-error">
                        {fieldState.error.message}
                      </small>
                    )}

                    {roleOptions.length === 0 && (
                      <small className="text-amber-600">
                        No active roles are available.
                      </small>
                    )}
                  </div>
                )}
              />
            </section>

            {!selectedRoleCode && (
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                <i className="pi pi-info-circle mt-0.5 text-slate-400" />

                <span>Select a role to load and manage its permissions.</span>
              </div>
            )}

            {selectedRoleCode && (
              <>
                {/* Role Summary */}
                <section className="flex flex-col gap-4 rounded-xl border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="m-0 truncate text-base font-semibold text-slate-800">
                        {selectedRole?.name || selectedRoleCode}
                      </h2>

                      <Tag value={selectedRoleCode} severity="info" rounded />
                    </div>

                    <p className="m-0 mt-2 text-sm leading-6 text-slate-600">
                      {selectedRole?.description ||
                        "Manage permissions assigned to this role."}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Tag
                      value={`${selectedPermissions.length} selected`}
                      severity="success"
                      rounded
                    />

                    <Tag
                      value={`${totalPermissionCount} available`}
                      severity="secondary"
                      rounded
                    />
                  </div>
                </section>

                {rolePermissionIsLoading && (
                  <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
                    <i className="pi pi-spin pi-spinner" />

                    <span>Loading assigned role permissions...</span>
                  </div>
                )}

                {rolePermissionError && (
                  <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3 text-sm text-red-700">
                      <i className="pi pi-exclamation-circle mt-0.5" />

                      <span>
                        Assigned permissions could not be loaded. Refresh the
                        data and try again.
                      </span>
                    </div>

                    <Button
                      type="button"
                      label="Retry"
                      icon="pi pi-refresh"
                      severity="danger"
                      outlined
                      size="small"
                      onClick={() => {
                        void refreshRolePermissionData();
                      }}
                    />
                  </div>
                )}

                {!rolePermissionIsLoading && !rolePermissionError && (
                  <>
                    {/* Permission Toolbar */}
                    <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 xl:flex-row xl:items-center xl:justify-between">
                      <div>
                        <h2 className="m-0 text-sm font-semibold text-slate-800">
                          Permission Access
                        </h2>

                        <p className="m-0 mt-1 text-xs text-slate-500">
                          Select permissions individually, by group, or for the
                          entire role at once.
                        </p>
                      </div>

                      <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
                        <div className="flex flex-1 gap-2 xl:flex-none">
                          <Button
                            type="button"
                            label="Select All"
                            icon="pi pi-check-square"
                            severity="secondary"
                            outlined
                            size="small"
                            disabled={
                              permissionSelectionDisabled ||
                              selectablePermissionCodes.length === 0 ||
                              allSelectablePermissionsSelected
                            }
                            className="flex-1 xl:flex-none"
                            onClick={handleSelectAllPermissions}
                          />

                          <Button
                            type="button"
                            label="Unselect All"
                            icon="pi pi-times"
                            severity="secondary"
                            outlined
                            size="small"
                            disabled={
                              permissionSelectionDisabled ||
                              selectedPermissions.length === 0
                            }
                            className="flex-1 xl:flex-none"
                            onClick={handleUnselectAllPermissions}
                          />
                        </div>

                        <IconField
                          iconPosition="left"
                          className="w-full sm:flex-1 xl:w-80 xl:flex-none"
                        >
                          <InputIcon className="pi pi-search" />

                          <InputText
                            value={permissionSearchValue}
                            onChange={onPermissionSearchChange}
                            placeholder="Search permission or group"
                            className="w-full"
                          />
                        </IconField>
                      </div>
                    </div>

                    {unavailablePermissionCount > 0 && (
                      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        <i className="pi pi-exclamation-triangle mt-0.5" />

                        <span>
                          {unavailablePermissionCount} assigned permission(s)
                          are inactive or no longer available. They remain
                          selected to prevent accidental removal. Uncheck them
                          before saving to remove them from this role.
                        </span>
                      </div>
                    )}

                    {groupedPermissions.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                        <i className="pi pi-key mb-3 text-3xl text-slate-400" />

                        <p className="m-0 text-sm font-medium text-slate-700">
                          No permissions available
                        </p>

                        <p className="m-0 mt-1 text-xs text-slate-500">
                          Create or activate permissions before assigning access
                          to this role.
                        </p>
                      </div>
                    ) : filteredPermissionGroups.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                        <i className="pi pi-search mb-3 text-3xl text-slate-400" />

                        <p className="m-0 text-sm font-medium text-slate-700">
                          No matching permissions
                        </p>

                        <p className="m-0 mt-1 text-xs text-slate-500">
                          Change the search keyword and try again.
                        </p>
                      </div>
                    ) : (
                      <Controller
                        name="permissions"
                        control={control}
                        render={({ field }) => {
                          const currentValue = (field.value ?? []).map((code) =>
                            String(code),
                          );

                          return (
                            <div className="flex flex-col gap-4">
                              {filteredPermissionGroups.map((group) => {
                                const groupCodes = group.permissions.map(
                                  (permission) => permission.code,
                                );

                                const checkedCount = groupCodes.filter((code) =>
                                  currentValue.includes(code),
                                ).length;

                                const isAllChecked =
                                  groupCodes.length > 0 &&
                                  checkedCount === groupCodes.length;

                                const isPartiallyChecked =
                                  checkedCount > 0 && !isAllChecked;

                                const groupCheckboxId = `select-all-${normalizeId(
                                  group.group,
                                )}`;

                                return (
                                  <section
                                    key={group.group}
                                    className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                                  >
                                    <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                                      <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <h3 className="m-0 text-sm font-semibold text-slate-800">
                                            {group.group_name}
                                          </h3>

                                          <Tag
                                            value={`${checkedCount}/${groupCodes.length}`}
                                            severity={
                                              checkedCount > 0
                                                ? "info"
                                                : "secondary"
                                            }
                                            rounded
                                          />
                                        </div>

                                        <p className="m-0 mt-1 font-mono text-xs text-slate-500">
                                          Resource: {group.group}
                                        </p>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <IndeterminateCheckbox
                                          inputId={groupCheckboxId}
                                          checked={isAllChecked}
                                          indeterminate={isPartiallyChecked}
                                          disabled={permissionSelectionDisabled}
                                          onChange={(event) => {
                                            if (event.checked) {
                                              field.onChange(
                                                Array.from(
                                                  new Set([
                                                    ...currentValue,
                                                    ...groupCodes,
                                                  ]),
                                                ),
                                              );

                                              return;
                                            }

                                            field.onChange(
                                              currentValue.filter(
                                                (code) =>
                                                  !groupCodes.includes(code),
                                              ),
                                            );
                                          }}
                                        />

                                        <label
                                          htmlFor={groupCheckboxId}
                                          className="cursor-pointer select-none text-sm font-medium text-slate-700"
                                        >
                                          Select All
                                        </label>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
                                      {group.permissions.map((permission) => {
                                        const checked = currentValue.includes(
                                          permission.code,
                                        );

                                        const permissionCheckboxId = `permission-${normalizeId(
                                          permission.code,
                                        )}`;

                                        return (
                                          <label
                                            key={permission.code}
                                            htmlFor={permissionCheckboxId}
                                            className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                                              checked
                                                ? "border-blue-300 bg-blue-50"
                                                : "border-slate-200 bg-white hover:bg-slate-50"
                                            }`}
                                          >
                                            <div className="flex items-start gap-3">
                                              <IndeterminateCheckbox
                                                inputId={permissionCheckboxId}
                                                checked={checked}
                                                disabled={
                                                  permissionSelectionDisabled
                                                }
                                                onChange={(event) => {
                                                  if (event.checked) {
                                                    field.onChange(
                                                      Array.from(
                                                        new Set([
                                                          ...currentValue,
                                                          permission.code,
                                                        ]),
                                                      ),
                                                    );

                                                    return;
                                                  }

                                                  field.onChange(
                                                    currentValue.filter(
                                                      (code) =>
                                                        code !==
                                                        permission.code,
                                                    ),
                                                  );
                                                }}
                                              />

                                              <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                  <span className="text-sm font-medium text-slate-800">
                                                    {permission.label}
                                                  </span>

                                                  {permission.unavailable && (
                                                    <Tag
                                                      value="Unavailable"
                                                      severity="warning"
                                                      rounded
                                                    />
                                                  )}
                                                </div>

                                                <p className="m-0 mt-2 break-all font-mono text-xs text-slate-500">
                                                  {permission.code}
                                                </p>
                                              </div>
                                            </div>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </section>
                                );
                              })}
                            </div>
                          );
                        }}
                      />
                    )}

                    {/* Save Actions */}
                    <div className="flex min-h-10 items-center border-t border-slate-200 pt-5">
                      <p className="m-0 text-xs text-slate-500">
                        {isDirty
                          ? "You have unsaved permission changes. Use the floating Save Changes button to apply them."
                          : "Role permissions are synchronized with the latest saved data."}
                      </p>
                    </div>
                  </>
                )}
              </>
            )}
          </form>
        </div>
      </Card>

      {selectedRoleCode && isDirty && (
        <div className="fixed bottom-4 right-4 z-50 w-[calc(100%-2rem)] sm:w-auto">
          <Button
            type="button"
            label="Save Changes"
            icon="pi pi-check"
            loading={isSaving}
            disabled={
              !canUpdateRolePermissions ||
              isSaving ||
              rolePermissionIsLoading ||
              Boolean(rolePermissionError)
            }
            className="w-full shadow-lg sm:w-auto"
            onClick={() => {
              void handleSubmit(onSave)();
            }}
          />
        </div>
      )}
    </>
  );
};

export default RolePermissionsTableData;
