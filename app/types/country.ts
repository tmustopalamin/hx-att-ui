export interface Country {
    id: number;
    code: string;
    name: string;
    is_active: boolean;
    deleted_at: string;
    row_version: number;
}