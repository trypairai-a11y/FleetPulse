"use client";
import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastVariant = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextType {
  toast: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  toast: () => {},
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev.slice(-4), { id, message, variant }]);
    setTimeout(() => dismiss(id), 5000);
  }, [dismiss]);

  const success = useCallback((msg: string) => toast(msg, "success"), [toast]);
  const error = useCallback((msg: string) => toast(msg, "error"), [toast]);
  const warning = useCallback((msg: string) => toast(msg, "warning"), [toast]);
  const info = useCallback((msg: string) => toast(msg, "info"), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const icons = {
    success: <CheckCircle size={16} aria-hidden="true" />,
    error: <XCircle size={16} aria-hidden="true" />,
    warning: <AlertTriangle size={16} aria-hidden="true" />,
    info: <Info size={16} aria-hidden="true" />,
  };

  const styles = {
    success: "bg-primary/10 border-primary/20 text-primary",
    error: "bg-red-50 border-red-200 text-red-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    info: "bg-slate2/10 border-slate2/20 text-slate2",
  };

  const iconStyles = {
    success: "text-primary",
    error: "text-red-500",
    warning: "text-amber-500",
    info: "text-slate2",
  };

  return (
    <div
      role="alert"
      className={cn(
        "pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lift text-sm backdrop-blur-sm",
        "animate-in slide-in-from-right-4 fade-in duration-250",
        styles[toast.variant]
      )}
    >
      <span className={cn("shrink-0 mt-0.5", iconStyles[toast.variant])}>
        {icons[toast.variant]}
      </span>
      <span className="flex-1 leading-relaxed">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
