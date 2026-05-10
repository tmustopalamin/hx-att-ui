export type QuickCreateMode = "employee_only" | "employee_with_user";

export type QuickCreateEmployeePayload = {
    create_user: boolean;
    employee: {
        first_name: string;
        middle_name?: string | null;
        last_name: string;
        dob: string;
        gender_id: number;
        religion_id: number;
        birth_place: string;
        marital_status_id: string;
        photo_url?: string | null;
    };
    user: {
        username: string;
        email: string;
        password: string | null;
        role: string[];
        is_active: boolean;
    } | null;
};

export type QuickCreateEmployeeResult = {
    employee_id: number;
    user_id: number | null;
    user_created: boolean;
    username: string | null;
    temporary_password: string | null;
};