export interface User {
    id: number;
    employee_id: number;
    username: string;
    password: string;
    email: string;
    role: string;
    is_active: boolean;
    deleted_at: string;
    row_version: number;
}