export interface FingerprintScanner {
    id: number;
    code: string;
    name: string;
    ip: string;
    port: string;
    password: string;
    is_active: boolean;
    deleted_at: string | null;
    row_version: number;
}