import { RotationRule } from "./employee-shift-rule";

export interface ShiftRule {
    id: number;
    name: string;
    schedule_type: string;
    base_shift_id: number;
    is_active: boolean;
    deleted_at: string;
    row_version: number;
    rotation_mode: string | null;
    change_day: string | null;
    rules: RotationRule[];
}