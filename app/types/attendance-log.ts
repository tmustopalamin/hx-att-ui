export interface AttendanceLog {
    id: number;
    employee_id: number | null;
    employee_name: string | null;

    event_time: string | null;
    event_time_source_local: string | null;
    source_tz_offset_minutes: number | null;

    source_type: string;
    status: string;

    machine_pin: string | null;
    machine_id: string | null;
    machine_name: string | null;

    device_id: string | null;
    photo_url: string | null;
    latitude: number | null;
    longitude: number | null;
    face_id: string | null;

    external_system: string | null;
    external_ref_id: string | null;
    extra_data: Record<string, unknown> | null;

    processed: boolean;
    processed_at: string | null;

    created_at: string | null;
    updated_at: string | null;
    row_version: number;
}