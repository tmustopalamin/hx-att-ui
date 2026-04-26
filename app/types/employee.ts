export interface Employee {
    id: number;
    first_name: string;
    middle_name?: string | null;
    last_name: string;
    preferred_name?: string | null;
    full_name: string;
    dob: string;
    gender_id: number;
    religion_id: number;
    birth_place: string;
    marital_status_id: string;
    photo_url?: string | null;
    phone_number?: string | null;
    personal_email?: string | null;
    work_email?: string | null;
    nationality_country_id?: number | null;

    deleted_at?: string | null;
    row_version: number;

    agency_name?: string | null;
    branch_name?: string | null;
    department_name?: string | null;
    position_name?: string | null;
    code?: string | null;
}