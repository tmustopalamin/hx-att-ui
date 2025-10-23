"use client";

import { Toast } from "primereact/toast";
import { useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "@/store/store";
import { hideToast } from "@/store/ToastSlice";

const GlobalToast = () => {
  const toastRef = useRef<Toast>(null);
  const toastState = useSelector((state: RootState) => state.toast);
  const dispatch = useDispatch();

  useEffect(() => {
    if (toastState.visible) {
      toastRef.current?.show({
        severity: toastState.severity,
        summary: toastState.summary,
        detail: toastState.detail,
        life: toastState.life,
      });

      // Auto-hide state agar tidak show terus
      dispatch(hideToast());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toastState.visible]);

  return <Toast ref={toastRef} position="top-center" />;
};

export default GlobalToast;
