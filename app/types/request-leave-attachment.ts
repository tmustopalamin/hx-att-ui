export interface RequestLeaveAttachment {
    id: number;
    employee_leave_id: number;
    employee_id: number;

    original_file_name: string;
    stored_file_name: string;
    file_url: string;
    content_type: string;
    file_size: number;

    created_at: string;
    created_by: number | null;
    updated_at: string;
    updated_by: number | null;
    deleted_at: string | null;
    deleted_by: number | null;
    row_version: number;
}