export interface EmployeeFingerprint {
    id: number;
    employee_id: number;
    fp_device_id: number;
    fp_device_name?: string | null;
    fp_pin: string;
    pin_already_exist: boolean;
    is_primary: boolean;
    deleted_at: string | null;
    row_version: number;
    updated_at?: string;
}