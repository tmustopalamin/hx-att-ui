import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ToastState {
  visible: boolean;
  severity?: "success" | "info" | "warn" | "error";
  summary?: string;
  detail?: string;
  life?: number;
}

const initialState: ToastState = {
  visible: false,
  severity: "success",
  summary: "",
  detail: "",
  life: 3000,
};

const ToastSlice = createSlice({
  name: "toast",
  initialState,
  reducers: {
    showToast: (state, action: PayloadAction<ToastState>) => {
      state.visible = true;
      state.severity = action.payload.severity;
      state.summary = action.payload.summary;
      state.detail = action.payload.detail;
      state.life = action.payload.life;
    },
    hideToast: (state) => {
      state.visible = false;
    },
  },
});

export const { showToast, hideToast } = ToastSlice.actions;
export default ToastSlice.reducer;
