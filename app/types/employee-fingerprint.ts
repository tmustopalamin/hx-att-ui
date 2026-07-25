export interface EmployeeFingerprint {
  id: number;
  employee_id: number;
  fp_device_id: number;
  fp_device_name?: string | null;

  /**
   * PIN2 / Fingerprint User ID / custom HRIS user id.
   * Ini input utama dari admin di form Employee Fingerprint.
   */
  fp_pin: string;

  /**
   * PIN1 / Machine PIN / internal id dari mesin fingerprint.
   * Diisi oleh backend setelah link existing atau create new user ke mesin.
   */
  fp_machine_pin?: string | null;

  /**
   * Nama user yang tersimpan di mesin fingerprint.
   */
  fp_device_user_name?: string | null;

  /**
   * true  = Link Existing User in Device
   * false = Create New User in Device
   */
  pin_already_exist: boolean;

  is_primary: boolean;
  deleted_at: string | null;
  row_version: number;
  updated_at?: string;
}
