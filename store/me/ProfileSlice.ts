import { Me } from "@/app/types/me";
import { createSlice, PayloadAction } from "@reduxjs/toolkit"

export interface ProfileState {
    employee_id: number,
    email: string,
    name: string,
    role: string[],
    photo_url: string,
}

const initialState: ProfileState = {
    employee_id: 0,
    email: '',
    name: '',
    role: [],
    photo_url: ''
}

export const ProfileSlice = createSlice({
    name: 'profile',
    initialState,
    reducers: {
        updateDataProfile: (state, action: PayloadAction<Me>) => {
            state.employee_id = action.payload.employee_id;
            state.email = action.payload.email;
            state.name = action.payload.name;
            state.role = action.payload.role;
            state.photo_url = action.payload.photo_url;
        },
        clearProfile: () => {
            return initialState;
        }
    },
});

export const { updateDataProfile, clearProfile } = ProfileSlice.actions;
export default ProfileSlice.reducer;