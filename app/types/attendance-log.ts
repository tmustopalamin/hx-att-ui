export interface AttendanceLog {
    id: number;
    employee_id: number;
    event_time: Date | null;
    event_time_local: string | null;
    source_type: string | null;
    machine_pin: string | null;
    machine_id: number | null;
    device_id: number | null;
    photo_url: string | null;
    latitude: number | null;
    longitude: number | null;
    face_id: string | null;
    external_system: string | null;
    external_ref_id: string | null;
    extra_data: string | null;
    employee_name: string;
    machine_name: string;
    processed: boolean;
}