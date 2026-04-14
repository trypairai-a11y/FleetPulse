"use client";

import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-50">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-foreground">{t("errors.somethingWrong")}</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {error.message || t("errors.unexpectedError")}
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-sm"
        >
          <RotateCcw className="w-4 h-4" />
          {t("actions.tryAgain")}
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors text-sm"
        >
          <Home className="w-4 h-4" />
          {t("actions.goHome")}
        </Link>
      </div>
    </div>
  );
}
