"use client";

import * as React from "react";
import { Toast } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-[420px]">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          open={true}
          onOpenChange={() => dismiss(toast.id)}
          variant={toast.variant}
          duration={toast.duration}
          className="shadow-lg"
        >
          <div className="grid gap-1">
            <div className="font-semibold">{toast.title}</div>
            {toast.description && (
              <div className="text-sm opacity-90">{toast.description}</div>
            )}
          </div>
        </Toast>
      ))}
    </div>
  );
}