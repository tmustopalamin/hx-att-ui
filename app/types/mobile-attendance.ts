export interface MobileAttendancePayload {
    event_time_source_local: string;
    source_tz_offset_minutes: number;

    device_id: string | null;
    photo_data_url: string | null;

    latitude: number | null;
    longitude: number | null;
    face_id: string | null;

    extra_data: Record<string, unknown> | null;
}