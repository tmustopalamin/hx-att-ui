export interface Frequency {
    id: number;
    name: string;
    description: string;
    days_in_period: number;
    is_active: boolean;
    deleted_at: string;
    row_version: number;
}