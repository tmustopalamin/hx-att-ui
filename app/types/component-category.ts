export interface ComponentCategory {
    id: number;
    code: string;
    name: string;
    description: string;
    display_order: number;
    category_type: string;
    is_active: boolean;
    deleted_at: string;
    row_version: number;
}