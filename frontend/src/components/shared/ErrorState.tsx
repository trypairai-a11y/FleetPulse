"use client";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
  className?: string;
}

export default function ErrorState({ error, onRetry, className }: ErrorStateProps) {
  const { t } = useI18n();
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 py-14 px-4 text-center ${className || ""}`}
      role="alert"
    >
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
        <AlertCircle size={22} className="text-red-500" aria-hidden="true" />
      </div>
      <div>
        <p className="font-display text-lg text-sand-900">{t("errors.somethingWrong")}</p>
        <p className="text-xs text-sand-600 mt-1 max-w-xs leading-relaxed">{error}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-4 h-9 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/15 rounded-pill transition-colors duration-250 ease-sierra-out"
          aria-label={t("actions.tryAgain")}
        >
          <RefreshCw size={12} aria-hidden="true" />
          {t("actions.tryAgain")}
        </button>
      )}
    </div>
  );
}
