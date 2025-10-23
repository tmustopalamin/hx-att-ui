export interface Shift {
    id: number;
    name: string;
    work_start: Date | null;
    work_end: Date | null;
    break_start: Date | null;
    break_end: Date | null;
    grace_period_minutes: number;
    checkin_start: Date | null;
    checkin_end: Date | null;
    checkout_start: Date | null;
    checkout_end: Date | null;
    is_night_shift: boolean;
    is_active: boolean;
    deleted_at: string;
    row_version: number;
}