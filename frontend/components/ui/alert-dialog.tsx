"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, AlertCircle, Info, Loader2 } from "lucide-react";

export type AlertDialogVariant = "success" | "error" | "warning" | "info";

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  variant?: AlertDialogVariant;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  loading?: boolean;
  showCancel?: boolean;
}

const variantConfig = {
  success: {
    icon: CheckCircle,
    iconColor: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    buttonVariant: "default" as const,
    buttonClassName: "bg-green-600 hover:bg-green-700 text-white",
  },
  error: {
    icon: XCircle,
    iconColor: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    buttonVariant: "destructive" as const,
    buttonClassName: "",
  },
  warning: {
    icon: AlertCircle,
    iconColor: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    buttonVariant: "default" as const,
    buttonClassName: "bg-amber-600 hover:bg-amber-700 text-white",
  },
  info: {
    icon: Info,
    iconColor: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    buttonVariant: "default" as const,
    buttonClassName: "bg-blue-600 hover:bg-blue-700 text-white",
  },
};

export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  variant = "info",
  confirmText = "OK",
  cancelText = "Abbrechen",
  onConfirm,
  onCancel,
  loading = false,
  showCancel = false,
}: AlertDialogProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-md", config.bgColor, config.borderColor, "border")}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn("rounded-full p-2", config.bgColor)}>
              <Icon className={cn("h-6 w-6", config.iconColor)} />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg">{title}</DialogTitle>
              {description && (
                <DialogDescription className="mt-2 text-gray-700">
                  {description}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="mt-4 flex flex-row-reverse gap-2">
          <Button
            onClick={handleConfirm}
            disabled={loading}
            variant={config.buttonVariant}
            className={cn(!showCancel && "w-full", config.buttonClassName)}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText}
          </Button>
          {showCancel && (
            <Button
              onClick={handleCancel}
              disabled={loading}
              variant="outline"
              className="flex-1"
            >
              {cancelText}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}