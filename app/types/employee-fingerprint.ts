export interface EmployeeFingerprint {
    id: number;
    employee_id: number;
    fp_device_id: number;
    fp_pin: string;
    pin_already_exist: boolean,
    deleted_at: string;
    row_version: number;
}