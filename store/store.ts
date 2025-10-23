import { configureStore } from '@reduxjs/toolkit'
import profileReducer from './me/ProfileSlice'
import toastReducer from "./ToastSlice";


export const store = configureStore({
  reducer: {
    profile: profileReducer,
    toast: toastReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch