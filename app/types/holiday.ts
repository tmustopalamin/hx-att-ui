export interface Holiday {
    id: number;
    code: string;
    name: string;
    holiday_date: string;
    holiday_type: string;
    description?: string | null;
    is_active: boolean;
    updated_at?: string;
    deleted_at: string | null;
    row_version: number;
}

export interface HolidayForm {
    id: number;
    code: string;
    name: string;
    holiday_date: Date | null;
    holiday_type: string;
    description?: string | null;
    is_active: boolean;
    deleted_at: string | null;
    row_version: number;
}