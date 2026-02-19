"use client";

import { useEffect } from "react";
import { QueryProvider } from "./QueryProvider";
import { Toaster } from "@/components/ui/sonner";
import { useUIStore } from "@/stores/uiStore";

function LanguageSync() {
  const language = useUIStore((s) => s.language);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  return null;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <LanguageSync />
      {children}
      <Toaster position="top-center" />
    </QueryProvider>
  );
}
