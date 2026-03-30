"use client";

import { useState, useCallback } from "react";
import { AlertDialogVariant } from "@/components/ui/alert-dialog";

export interface AlertDialogOptions {
  title: string;
  description?: string;
  variant?: AlertDialogVariant;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface AlertDialogState extends AlertDialogOptions {
  open: boolean;
  loading?: boolean;
}

export function useAlertDialog() {
  const [state, setState] = useState<AlertDialogState>({
    open: false,
    title: "",
    variant: "info",
  });

  const showAlert = useCallback((options: AlertDialogOptions) => {
    setState({
      ...options,
      open: true,
      loading: false,
    });
  }, []);

  const showConfirm = useCallback((options: AlertDialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        ...options,
        open: true,
        showCancel: true,
        loading: false,
        onConfirm: () => {
          resolve(true);
          options.onConfirm?.();
        },
        onCancel: () => {
          resolve(false);
          options.onCancel?.();
        },
      });
    });
  }, []);

  const closeDialog = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  const alertDialogProps = {
    open: state.open,
    onOpenChange: (open: boolean) => {
      if (!open) closeDialog();
    },
    title: state.title,
    description: state.description,
    variant: state.variant,
    confirmText: state.confirmText,
    cancelText: state.cancelText,
    showCancel: state.showCancel,
    onConfirm: state.onConfirm,
    onCancel: state.onCancel,
    loading: state.loading,
  };

  return {
    alertDialogProps,
    showAlert,
    showConfirm,
    closeDialog,
    setLoading,
  };
}