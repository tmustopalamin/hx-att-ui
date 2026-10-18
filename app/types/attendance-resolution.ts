export interface AttendanceResolutionItem {
  key?: string;
  employee_id: number;
  employee_name?: string | null;
  shift_date: string; // YYYY-MM-DD
  shift_name?: string | null;
  scheduled_start_time?: string | null;
  scheduled_end_time?: string | null;
  current_status?: string | null;
  is_missing_check_in?: boolean;
  is_missing_check_out?: boolean;
  resolution_action: "USE_SHIFT_TIME" | "CUSTOM_TIME";
  check_in_time?: string | null; // HH:mm:ss or HH:mm
  check_out_time?: string | null; // HH:mm:ss or HH:mm
  reason: string;
  notes?: string | null;
}

export interface BatchAttendanceResolutionRequest {
  items: Array<{
    employee_id: number;
    shift_date: string;
    resolution_action: "USE_SHIFT_TIME" | "CUSTOM_TIME";
    check_in_time?: string | null;
    check_out_time?: string | null;
    reason: string;
    notes?: string | null;
  }>;
  default_reason?: string;
  default_notes?: string;
}

export interface BatchAttendanceResolutionResponse {
  success: boolean;
  resolved_items_count: number;
  created_logs_count: number;
  reprocessed_summaries_count: number;
  message: string;
}
