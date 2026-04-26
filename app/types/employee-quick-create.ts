export type QuickCreateMode = "employee_only" | "employee_with_user";

export interface QuickCreateEmployeePayload {
    create_user: boolean;
    employee: {
        first_name: string;
        last_name: string;
        dob: string;
        gender_id: number;
        religion_id: number;
        birth_place: string;
        marital_status_id: string;
        photo_url: string | null;
    };
    user: QuickCreateUserPayload | null;
}

export interface QuickCreateUserPayload {
    username: string;
    email: string;
    password: string | null;
    role: string[];
    is_active: boolean;
}

export interface QuickCreateEmployeeResult {
    employee_id: number;
    user_id: number | null;
    user_created: boolean;
    username: string | null;
    temporary_password: string | null;
}