export interface Branch {
    id: number;
    code: string;
    name: string;
    address: string;
    city_id: number;
    state_id: number;
    postal_code: string;
    phone_number: string;
    fax_number: string;
    nitku_number: string;
    npwp15_number: string;
    npwp16_number: string;
    is_active: boolean;
    deleted_at: string;
    row_version: number;
}