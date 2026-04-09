"use client";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
  className?: string;
}

export default function ErrorState({ error, onRetry, className }: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-12 px-4 text-center ${className || ""}`}
      role="alert"
    >
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
        <AlertCircle size={22} className="text-red-500" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-800">Something went wrong</p>
        <p className="text-xs text-gray-500 mt-0.5 max-w-xs">{error}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          aria-label="Retry loading data"
        >
          <RefreshCw size={12} aria-hidden="true" />
          Try again
        </button>
      )}
    </div>
  );
}
